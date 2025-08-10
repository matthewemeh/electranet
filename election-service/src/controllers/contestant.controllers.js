const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const Log = require('../models/log.model');
const Party = require('../models/party.model');
const supabase = require('../services/supabase');
const { logger } = require('../utils/logger.utils');
const Contestant = require('../models/contestant.model');
const { CONTESTANT_IMAGE_KEY } = require('../constants');
const { APIError } = require('../middlewares/error.middlewares');
const { getContestantImageKey } = require('../utils/party.utils');
const ElectionContestant = require('../models/election-contestant.model');
const {
  validateContestant,
  validateGetContestants,
  validateContestantUpdate,
} = require('../utils/validation.utils');
const {
  redisCacheExpiry,
  getContestantsKey,
  getElectionContestantsKey,
} = require('../utils/redis.utils');

const { SUPABASE_BUCKET_NAME } = process.env;

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const addContestant = async (req, res) => {
  logger.info('Add Contestant endpoint called');

  // validate request body and files
  const { error, value: reqBody } = validateContestant(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const contestantImage = req.files?.find(({ fieldname }) => fieldname === CONTESTANT_IMAGE_KEY);
  if (!contestantImage) {
    logger.warn('Validation error', {
      message: `"${CONTESTANT_IMAGE_KEY}" is missing in Multipart form data`,
    });
    throw new APIError(
      `"${CONTESTANT_IMAGE_KEY}" is missing in Multipart form data`,
      StatusCodes.BAD_REQUEST
    );
  }

  // check if given party exists
  if (reqBody.party) {
    const partyExists = await Party.findById(reqBody.party);
    if (!partyExists) {
      logger.error('Party does not exist');
      throw new APIError('Party does not exist', StatusCodes.BAD_REQUEST);
    }
  }

  const contestant = new Contestant(reqBody);

  // Upload to Supabase Storage
  const filePath = getContestantImageKey(contestant._id);
  const { error: supabaseError } = await supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .upload(filePath, contestantImage.buffer, {
      contentType: contestantImage.mimetype,
      cacheControl: '3600',
    });

  if (supabaseError) {
    throw supabaseError;
  }

  // Get Public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(filePath);

  contestant.profileImageUrl = publicUrl;
  await contestant.save();

  // create an event log
  await Log.create({
    user: req.user._id,
    action: 'CONTESTANT_ADD',
    message: `Added new contestant: ${contestant.fullName}`,
  });

  logger.info('Contestant created');
  res
    .status(StatusCodes.CREATED)
    .json({ success: true, message: 'Contestant created', data: contestant });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const updateContestant = async (req, res) => {
  logger.info('Update Contestant endpoint called');

  // validate request body
  const { error, value: reqBody } = validateContestantUpdate(req.body ?? {});
  const contestantImage = req.files?.find(({ fieldname }) => fieldname === CONTESTANT_IMAGE_KEY);
  const isFilePayload = Object.keys(reqBody).length === 0;

  if ((isFilePayload && !contestantImage) || (!isFilePayload && error)) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;

  // check if contestant exists
  const contestant = await Contestant.findById(id);
  if (!contestant) {
    logger.error('Contestant not found');
    throw new APIError('Contestant not found', StatusCodes.NOT_FOUND);
  }

  // check if given party exists
  if (reqBody.party) {
    const partyExists = await Party.findById(reqBody.party);
    if (!partyExists) {
      logger.error('Party does not exist');
      throw new APIError('Party does not exist', StatusCodes.BAD_REQUEST);
    }
  }

  // update non-file fields
  Object.assign(contestant, reqBody);

  // check if contestant image is provided
  // if provided, upload to Supabase Storage and update contestant profileImageUrl
  if (contestantImage) {
    // Upload to Supabase Storage
    const filePath = getContestantImageKey(contestant._id);
    const { error: supabaseError } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .upload(filePath, contestantImage.buffer, {
        contentType: contestantImage.mimetype,
        cacheControl: '3600',
        upsert: true,
      });

    if (supabaseError) {
      throw supabaseError;
    }

    // Get Public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(filePath);

    // Since the image is updated with same file path, we need to invalidate the cache via cache busting
    contestant.profileImageUrl = `${publicUrl}?cb=${Date.now()}`;
  }

  // proceed to update contestant
  await contestant.save();

  // create an event log
  await Log.create({
    user: req.user._id,
    action: 'CONTESTANT_UPDATE',
    message: `Updated contestant: ${contestant.fullName}`,
  });

  logger.info('Contestant updated successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Contestant updated successfully', data: null });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getContestants = async (req, res) => {
  logger.info('Get Contestants endpoint called');

  // validate request query
  const { error, value: reqBody } = validateGetContestants(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { page, limit, sortBy, ...docQuery } = reqBody;
  const { party, isDeleted, gender, firstName, lastName } = docQuery;

  // check cached contestants
  const contestantsCacheKey = getContestantsKey(
    page,
    limit,
    sortBy,
    party,
    gender,
    lastName,
    firstName,
    isDeleted
  );
  let paginatedContestants = await req.redisClient.get(contestantsCacheKey);
  if (paginatedContestants) {
    logger.info('Contestants fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedContestants),
      message: 'Contestants fetched successfully',
    });
  }

  if (firstName) {
    docQuery.firstName = { $regex: firstName, $options: 'i' };
  }

  if (lastName) {
    docQuery.lastName = { $regex: lastName, $options: 'i' };
  }

  // fallback to DB
  const sort = sortBy ? JSON.parse(sortBy) : { updatedAt: -1 };
  paginatedContestants = await Contestant.paginate(docQuery, {
    sort,
    page,
    limit,
    select: '-__v',
    populate: { path: 'party', select: '-createdAt -updatedAt -__v' },
  });

  // cache fetched contestants
  await req.redisClient.setex(
    contestantsCacheKey,
    redisCacheExpiry,
    JSON.stringify(paginatedContestants)
  );

  logger.info('Contestants fetched successfully');
  res.status(StatusCodes.OK).json({
    success: true,
    data: paginatedContestants,
    message: 'Contestants fetched successfully',
  });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getElectionContestants = async (req, res) => {
  logger.info('Get Election Contestants endpoint called');

  const { id } = req.params;

  // check cached election contestants
  const contestantsCacheKey = getElectionContestantsKey(id);
  let contestants = await req.redisClient.get(contestantsCacheKey);
  if (contestants) {
    logger.info('Contestants fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(contestants),
      message: 'Contestants fetched successfully',
    });
  }

  // fallback to DB
  contestants = await ElectionContestant.find({ election: id })
    .select('contestant -_id')
    .populate({
      path: 'contestant',
      select: '-createdAt -updatedAt -__v',
      populate: { path: 'party', select: '-createdAt -updatedAt -__v' },
    });

  contestants = contestants
    .filter(({ contestant }) => !contestant.isDeleted)
    .map(({ contestant }) => contestant);

  // cache fetched election contestants
  await req.redisClient.setex(contestantsCacheKey, redisCacheExpiry, JSON.stringify(contestants));

  logger.info('Contestants fetched successfully');
  res.status(StatusCodes.OK).json({
    success: true,
    data: contestants,
    message: 'Contestants fetched successfully',
  });
};

module.exports = { addContestant, getContestants, updateContestant, getElectionContestants };
