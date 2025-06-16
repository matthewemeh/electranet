const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const Log = require('../models/log.model');
const Party = require('../models/party.model');
const supabase = require('../services/supabase');
const { PARTY_IMAGE_KEY } = require('../constants');
const { logger } = require('../utils/logger.utils');
const { getPartyImageKey } = require('../utils/party.utils');
const { APIError } = require('../middlewares/error.middlewares');
const { redisCacheExpiry, getPartiesKey } = require('../utils/redis.utils');
const {
  validateParty,
  validateGetParties,
  validatePartyUpdate,
} = require('../utils/validation.utils');

const { SUPABASE_BUCKET_NAME } = process.env;

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const addParty = async (req, res) => {
  logger.info('Add Party endpoint called');

  // validate request body and files
  const { error, value: reqBody } = validateParty(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const partyImage = req.files?.find(({ fieldname }) => fieldname === PARTY_IMAGE_KEY);
  if (!partyImage) {
    logger.warn('Validation error', {
      message: `"${PARTY_IMAGE_KEY}" is missing in Multipart form data`,
    });
    throw new APIError(
      `"${PARTY_IMAGE_KEY}" is missing in Multipart form data`,
      StatusCodes.BAD_REQUEST
    );
  }

  const party = new Party(reqBody);

  // Upload to Supabase Storage
  const filePath = getPartyImageKey(party._id);
  const { error: supabaseError } = await supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .upload(filePath, partyImage.buffer, {
      contentType: partyImage.mimetype,
      cacheControl: '3600',
    });

  if (supabaseError) {
    throw supabaseError;
  }

  // Get Public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(SUPABASE_BUCKET_NAME).getPublicUrl(filePath);

  party.logoUrl = publicUrl;
  await party.save();

  // create event log
  await Log.create({
    user: req.user._id,
    action: 'PARTY_ADD',
    message: `Added new party: ${party.longName}`,
  });

  logger.info('Party added successfully');
  res
    .status(StatusCodes.CREATED)
    .json({ success: true, message: 'Party added successfully', data: party });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const updateParty = async (req, res) => {
  logger.info('Edit Party endpoint called');

  // validate request body
  const { error, value: reqBody } = validatePartyUpdate(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;

  // check if party exists
  const party = await Party.findById(id);
  if (!party) {
    logger.error('Party not found');
    throw new APIError('Party not found', StatusCodes.NOT_FOUND);
  }

  // update non-file fields
  Object.assign(party, reqBody);

  // check if party image is provided
  // if provided, upload to Supabase Storage and update party logoUrl
  const partyImage = req.files?.find(({ fieldname }) => fieldname === PARTY_IMAGE_KEY);
  if (partyImage) {
    // Upload to Supabase Storage
    const filePath = getPartyImageKey(party._id);
    const { error: supabaseError } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .upload(filePath, partyImage.buffer, {
        contentType: partyImage.mimetype,
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
    party.logoUrl = `${publicUrl}?cb=${Date.now()}`;
  }

  // proceed to update party
  await party.save();

  // create event log
  await Log.create({
    user: req.user._id,
    action: 'PARTY_UPDATE',
    message: `Updated party: ${party.longName}`,
  });

  logger.info('Party updated successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Party updated successfully', data: null });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getParties = async (req, res) => {
  logger.info('Get Parties endpoint called');

  // validate request query
  const { error, value } = validateGetParties(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  let parties, partiesKey;

  // check if request is for pagination
  const { page, limit } = value;
  if (page && !limit) {
    logger.warn(
      '"limit" is required when "page" is provided. Both "page" and "limit" must be specified for pagination.'
    );
    throw new APIError(
      '"limit" is required when "page" is provided. Both "page" and "limit" must be specified for pagination.',
      StatusCodes.BAD_REQUEST
    );
  } else if (limit && !page) {
    logger.warn(
      '"page" is required when "limit" is provided. Both "page" and "limit" must be specified for pagination.'
    );
    throw new APIError(
      '"page" is required when "limit" is provided. Both "page" and "limit" must be specified for pagination.',
      StatusCodes.BAD_REQUEST
    );
  }

  if (page && limit) {
    // check cached paginated parties
    partiesKey = getPartiesKey(page, limit);
    parties = await req.redisClient.get(partiesKey);
    if (parties) {
      logger.info('Parties fetched successfully');
      return res.status(StatusCodes.OK).json({
        success: true,
        data: JSON.parse(parties),
        message: 'Parties fetched successfully',
      });
    }

    // fallback to DB
    parties = await Party.paginate({}, { page, limit, sort: { longName: 1 } });

    // cache paginated parties
    await req.redisClient.setex(partiesKey, redisCacheExpiry, JSON.stringify(parties));

    logger.info('Parties fetched successfully');
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: 'Parties fetched successfully', data: parties });
  }

  // pagination isn't required here
  // probably being used to fill a dropdown

  // check cached parties
  partiesKey = getPartiesKey();
  parties = await req.redisClient.get(partiesKey);
  if (parties) {
    logger.info('Parties fetched successfully');
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: 'Parties fetched successfully', data: JSON.parse(parties) });
  }

  // fallback to DB
  parties = await Party.find({}).select('shortName longName logoUrl -_id').sort({ longName: 1 });

  // cache parties
  await req.redisClient.setex(partiesKey, redisCacheExpiry, JSON.stringify(parties));

  logger.info('Parties fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Parties fetched successfully', data: parties });
};

module.exports = { addParty, getParties, updateParty };
