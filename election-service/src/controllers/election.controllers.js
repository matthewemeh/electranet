const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const Log = require('../models/log.model');
const { logger } = require('../utils/logger.utils');
const Election = require('../models/election.model');
const Contestant = require('../models/contestant.model');
const ElectionVoted = require('../models/election-voted.model');
const { APIError } = require('../middlewares/error.middlewares');
const ElectionContestant = require('../models/election-contestant.model');
const {
  deleteCacheKey,
  getElectionsKey,
  redisCacheExpiry,
  getUserElectionsKey,
  getElectionsVotedKey,
  deleteCachePatternAsync,
  getElectionContestantsKey,
} = require('../utils/redis.utils');
const {
  validateElection,
  validateGetElections,
  validateElectionUpdate,
  validateGetUserElections,
  validateElectionContestant,
} = require('../utils/validation.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const addElection = async (req, res) => {
  logger.info('Add Election endpoint called');

  // validate request body
  const { error, value: reqBody } = validateElection(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  // proceed to create election
  const election = await Election.create(reqBody);

  // create an event log
  await Log.create({
    user: req.user._id,
    action: 'ELECTION_ADD',
    message: `Added new election: ${election.name}`,
  });

  // delete elections cache
  const electionsCacheKey = getElectionsKey('*');
  deleteCachePatternAsync(electionsCacheKey, req.redisClient, 500);

  logger.info('Election created');
  res
    .status(StatusCodes.CREATED)
    .json({ success: true, message: 'Election created', data: election });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getElections = async (req, res) => {
  logger.info('Get Elections endpoint called');

  // validate request query
  const { error, value: reqQuery } = validateGetElections(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { page, limit, sortBy, ...docQuery } = reqQuery;
  const { delimitationCode, startTime, endTime } = docQuery;

  // check cached elections
  const electionsCacheKey = getElectionsKey(
    page,
    limit,
    sortBy,
    endTime,
    startTime,
    delimitationCode
  );
  let paginatedElections = await req.redisClient.get(electionsCacheKey);
  if (paginatedElections) {
    logger.info('Elections fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedElections),
      message: 'Elections fetched successfully',
    });
  }

  if (delimitationCode) {
    docQuery.delimitationCode = { $regex: `^${delimitationCode}`, $options: 'i' };
  }

  if (startTime) {
    docQuery.startTime = { $gte: startTime };
  }

  if (endTime) {
    docQuery.endTime = { $lte: endTime };
  }

  // fallback to DB
  const sort = sortBy ? JSON.parse(sortBy) : { createdAt: -1 };
  paginatedElections = await Election.paginate(docQuery, {
    sort,
    page,
    limit,
    select: '-createdAt -updatedAt -__v',
  });

  // cache fetched elections
  await req.redisClient.setex(
    electionsCacheKey,
    redisCacheExpiry,
    JSON.stringify(paginatedElections)
  );

  logger.info('Elections fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, data: paginatedElections, message: 'Elections fetched successfully' });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getUserElections = async (req, res) => {
  logger.info('Get User Elections endpoint called');

  // validate request query
  const { error, value: reqQuery } = validateGetUserElections(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { user } = req;
  const { page, limit, sortBy, ...docQuery } = reqQuery;
  const { startTime, endTime } = docQuery;

  // check cache for user elections
  const userElectionsKey = getUserElectionsKey(page, limit, sortBy, startTime, endTime);
  let paginatedElections = await req.redisClient.get(userElectionsKey);
  if (paginatedElections) {
    logger.info('Elections fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedElections),
      message: 'Elections fetched successfully',
    });
  }

  docQuery.delimitationCode = { $in: user.getDelimitations() };
  if (startTime) {
    docQuery.startTime = { $gte: startTime };
  }

  if (endTime) {
    docQuery.endTime = { $lte: endTime };
  }

  // fallback to DB
  const sort = sortBy ? JSON.parse(sortBy) : { startTime: -1 };
  paginatedElections = await Election.paginate(docQuery, {
    sort,
    page,
    limit,
    select: '-createdAt -updatedAt -__v',
  });

  // cache fetched user elections
  await req.redisClient.setex(
    userElectionsKey,
    redisCacheExpiry,
    JSON.stringify(paginatedElections)
  );

  logger.info('Elections fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, data: paginatedElections, message: 'Elections fetched successfully' });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getUserVotedElections = async (req, res) => {
  logger.info('Get User Voted Elections endpoint called');

  const { user } = req;

  // check cache for user voted elections
  const electionsVotedCacheKey = getElectionsVotedKey(user._id);
  let votedElections = await req.redisClient.get(electionsVotedCacheKey);
  if (votedElections) {
    logger.info('Voted Elections fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(votedElections),
      message: 'Voted Elections fetched successfully',
    });
  }

  votedElections = await ElectionVoted.find({ user: user._id }).select('election createdAt -_id');

  // cache fetched user voted elections
  await req.redisClient.setex(electionsVotedCacheKey, 86_400, JSON.stringify(votedElections));

  logger.info('Voted Elections fetched successfully');
  res.status(StatusCodes.OK).json({
    success: true,
    data: votedElections,
    message: 'Voted Elections fetched successfully',
  });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const updateElection = async (req, res) => {
  logger.info('Update Election endpoint called');

  // validate request body
  const { error, value: reqBody } = validateElectionUpdate(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  // update the election
  const { id } = req.params;

  // check if election exists
  const election = await Election.findById(id);
  if (!election) {
    logger.error('Election not found');
    throw new APIError('Election not found', StatusCodes.NOT_FOUND);
  }

  // check if fields are editable
  if (reqBody.endTime && election.hasEnded) {
    logger.info('Completed election cannot be edited');
    throw new APIError('Completed election cannot be edited', StatusCodes.BAD_REQUEST);
  } else if (
    (reqBody.startTime || reqBody.name || reqBody.delimitationCode) &&
    election.hasStarted
  ) {
    logger.info('Commenced election cannot be edited');
    throw new APIError('Commenced election cannot be edited', StatusCodes.BAD_REQUEST);
  }

  // proceed to update election
  Object.assign(election, reqBody);
  await election.save();

  // create an event log
  await Log.create({
    user: req.user._id,
    action: 'ELECTION_UPDATE',
    message: `Updated election: ${election.name}`,
  });

  logger.info('Election updated successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Election updated successfully', data: null });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const deleteElection = async (req, res) => {
  logger.info('Delete Election endpoint called');

  const { id } = req.params;

  // check if election exists and has not started
  const election = await Election.findById(id);
  if (!election) {
    logger.error('Election not found');
    throw new APIError('Election not found', StatusCodes.NOT_FOUND);
  } else if (election.hasStarted) {
    logger.error('Election has already commenced');
    throw new APIError('Election has already commenced', StatusCodes.BAD_REQUEST);
  }

  // delete the election
  await Election.deleteOne({ _id: id });

  // remove all booked election contestants
  await ElectionContestant.deleteMany({ election: id });

  // create an event log
  await Log.create({
    user: req.user._id,
    action: 'ELECTION_DELETE',
    message: `Deleted Election: ${election.name}`,
  });

  // delete elections cache
  const electionsCacheKey = getElectionsKey('*');
  deleteCachePatternAsync(electionsCacheKey, req.redisClient, 500);

  logger.info('Election deleted successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Election deleted successfully', data: null });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const addContestant = async (req, res) => {
  logger.info('Add Election Contestant endpoint called');

  // validate request body
  const { error, value: reqBody } = validateElectionContestant(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;
  const { contestantID } = reqBody;

  // check if contestant exists and is registered under a party
  const contestant = await Contestant.findById(contestantID);
  if (!contestant) {
    logger.error('Contestant not found');
    throw new APIError('Contestant not found', StatusCodes.NOT_FOUND);
  } else if (!contestant.party) {
    logger.error('Contestant not registered under a party');
    throw new APIError('Contestant not registered under a party', StatusCodes.BAD_REQUEST);
  }

  // check if election exists and has not started
  const election = await Election.findById(id);
  if (!election) {
    logger.error('Election not found');
    throw new APIError('Election not found', StatusCodes.NOT_FOUND);
  } else if (election.hasStarted) {
    logger.error('Election has already commenced');
    throw new APIError('Election has already commenced', StatusCodes.BAD_REQUEST);
  }

  try {
    await ElectionContestant.create({
      election: id,
      party: contestant.party,
      contestant: contestantID,
    });
  } catch (error) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      error.customMessage = 'Contestant already registered for this election!';
      throw error;
    }
  }

  // clear election contestants cache
  const contestantsCacheKey = getElectionContestantsKey(id);
  await deleteCacheKey(contestantsCacheKey, req.redisClient);

  // create an event log
  await Log.create({
    user: req.user._id,
    action: 'ELECTION_CONTESTANT_ADD',
    message: `Added contestant: ${contestant.fullName} to election: ${election.name}`,
  });

  logger.info('Contestant added successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Contestant added successfully', data: null });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const removeContestant = async (req, res) => {
  logger.info('Remove Election Contestant endpoint called');

  // validate request body
  const { error, value: reqBody } = validateElectionContestant(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;
  const { contestantID } = reqBody;

  // check if contestant exists
  const contestant = await Contestant.findById(contestantID);
  if (!contestant) {
    logger.error('Contestant not found');
    throw new APIError('Contestant not found', StatusCodes.NOT_FOUND);
  }

  // check if election exists and has not started
  const election = await Election.findById(id);
  if (!election) {
    logger.error('Election not found');
    throw new APIError('Election not found', StatusCodes.NOT_FOUND);
  } else if (election.hasStarted) {
    logger.error('Election has already commenced');
    throw new APIError('Election has already commenced', StatusCodes.BAD_REQUEST);
  }

  const result = await ElectionContestant.deleteOne({ election: id, contestant: contestantID });

  if (!result.deletedCount) {
    logger.error('Contestant already removed from this election!');
    throw new APIError('Contestant already removed from this election!', StatusCodes.BAD_REQUEST);
  }

  // clear election contestants cache
  const contestantsCacheKey = getElectionContestantsKey(id);
  await deleteCacheKey(contestantsCacheKey, req.redisClient);

  // create an event log
  await Log.create({
    user: req.user._id,
    action: 'ELECTION_CONTESTANT_REMOVE',
    message: `Removed contestant: ${contestant.fullName} from election: ${election.name}`,
  });

  logger.info('Contestant removed successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Contestant removed successfully', data: null });
};

module.exports = {
  addElection,
  getElections,
  addContestant,
  updateElection,
  deleteElection,
  getUserElections,
  removeContestant,
  getUserVotedElections,
};
