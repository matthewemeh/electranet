const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const Log = require('../models/log.model');
const { logger } = require('../utils/logger.utils');
const Election = require('../models/election.model');
const Contestant = require('../models/contestant.model');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');
const {
  validateContestant,
  validateGetContestants,
  validateContestantUpdate,
} = require('../utils/validation.utils');
const {
  deleteCacheKey,
  redisCacheExpiry,
  getContestantsKey,
  getElectionContestantsKey,
} = require('../utils/redis.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const addContestant = async (req, res) => {
  logger.info('Add Contestant endpoint called');

  // validate request body
  const { error } = validateContestant(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  // proceed to create contestant
  const contestant = await Contestant.create(req.body);

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
  const { error } = validateContestantUpdate(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  // update the contestant
  const { id } = req.params;
  const contestant = await Contestant.findByIdAndUpdate(id, req.body, { new: true });
  if (!contestant) {
    logger.error('Contestant not found');
    throw new APIError('Contestant not found', StatusCodes.NOT_FOUND);
  }

  // clear election contestants cache
  const contestantsCacheKey = getElectionContestantsKey(contestant.election);
  await deleteCacheKey(contestantsCacheKey, req.redisClient);

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
  const { error, value } = validateGetContestants(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { page, limit, ...docQuery } = value;
  const { party, isDeleted, gender, firstName, lastName } = docQuery;

  // check cached contestants
  const contestantsCacheKey = getContestantsKey(
    page,
    limit,
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

  // fallback to DB
  paginatedContestants = await Contestant.paginate(docQuery, {
    page,
    limit,
    sort: { updatedAt: -1 },
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
  const election = await Election.findById(id)
    .select('contestants -_id')
    .populate({
      path: 'contestants',
      select: '-election -createdAt -updatedAt -__v',
      populate: { path: 'party', select: '-createdAt -updatedAt -__v' },
    });
  if (!election) {
    logger.info('Election not found');
    throw new APIError('Election not found', StatusCodes.NOT_FOUND);
  }

  contestants = election.contestants.filter(({ isDeleted }) => !isDeleted);

  // cache fetched election contestants
  await req.redisClient.setex(contestantsCacheKey, 1800, JSON.stringify(contestants));

  logger.info('Contestants fetched successfully');
  res.status(StatusCodes.OK).json({
    success: true,
    data: contestants,
    message: 'Contestants fetched successfully',
  });
};

module.exports = {
  addContestant: asyncHandler(addContestant),
  getContestants: asyncHandler(getContestants),
  updateContestant: asyncHandler(updateContestant),
  getElectionContestants: asyncHandler(getElectionContestants),
};
