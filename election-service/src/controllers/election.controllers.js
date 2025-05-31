const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const Log = require('../models/log.model');
const { logger } = require('../utils/logger.utils');
const Election = require('../models/election.model');
const Contestant = require('../models/contestant.model');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');
const { getElectionsKey, redisCacheExpiry, getUserElectionsKey } = require('../utils/redis.utils');
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
  const { error } = validateElection(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  // proceed to create election
  const election = await Election.create(req.body);

  // create an event log
  await Log.create({
    user: req.user._id,
    action: 'ELECTION_ADD',
    message: `Added new election: ${election.name}`,
  });

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
  const { error, value } = validateGetElections(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { page, limit, ...docQuery } = value;
  const { delimitationCode, startTime, endTime } = docQuery;

  // check cached elections
  const electionsCacheKey = getElectionsKey(page, limit, delimitationCode, startTime, endTime);
  let paginatedElections = await req.redisClient.get(electionsCacheKey);
  if (paginatedElections) {
    logger.info('Elections fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedElections),
      message: 'Elections fetched successfully',
    });
  }

  if (startTime) {
    docQuery.startTime = { $gte: startTime };
  }
  if (endTime) {
    docQuery.endTime = { $lte: endTime };
  }

  // fallback to DB
  paginatedElections = await Election.paginate(docQuery, {
    page,
    limit,
    sort: { createdAt: -1 },
    select: '-contestants -createdAt -updatedAt -__v',
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
  const { error, value } = validateGetUserElections(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { user } = req;
  const { page, limit, ...docQuery } = value;
  const { startTime, endTime } = docQuery;

  // check cache for user elections
  const userElectionsKey = getUserElectionsKey(user._id, page, limit, startTime, endTime);
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
  paginatedElections = await Election.paginate(docQuery, {
    page,
    limit,
    sort: { createdAt: -1 },
    select: '-createdAt -updatedAt -__v -startTime -endTime -contestants',
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
const updateElection = async (req, res) => {
  logger.info('Update Election endpoint called');

  // validate request body
  const { error } = validateElectionUpdate(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  // update the election
  const { id } = req.params;
  const payload = req.body;

  // check if election exists
  const election = await Election.findById(id);
  if (!election) {
    logger.error('Election not found');
    throw new APIError('Election not found', StatusCodes.NOT_FOUND);
  }

  // check if fields are editable
  if (payload.endTime && election.hasEnded) {
    logger.info('Completed election cannot be edited');
    throw new APIError('Completed election cannot be edited', StatusCodes.BAD_REQUEST);
  } else if (
    (payload.startTime || payload.name || payload.delimitationCode) &&
    election.hasStarted
  ) {
    logger.info('Commenced election cannot be edited');
    throw new APIError('Commenced election cannot be edited', StatusCodes.BAD_REQUEST);
  }

  // proceed to update election
  Object.assign(election, payload);
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

  // remove the contestants' election field
  await Contestant.updateMany({ election: id }, { $unset: { election: '' } });

  // create an event log
  await Log.create({
    user: req.user._id,
    action: 'ELECTION_DELETE',
    message: `Deleted Election: ${election.name}`,
  });

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
  const { error } = validateElectionContestant(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;
  const { contestantID } = req.body;

  // check if contestant exists and is registered under a party
  const contestant = await Contestant.findById(contestantID);
  if (!contestant) {
    logger.error('Contestant not found');
    throw new APIError('Contestant not found', StatusCodes.NOT_FOUND);
  } else if (!contestant.party) {
    logger.error('Contestant not registered under a party');
    throw new APIError('Contestant not registered under a party', StatusCodes.BAD_REQUEST);
  }

  // check if election exists, has not started and contestant hasn't been added already
  const election = await Election.findById(id);
  if (!election) {
    logger.error('Election not found');
    throw new APIError('Election not found', StatusCodes.NOT_FOUND);
  } else if (election.hasStarted) {
    logger.error('Election has already commenced');
    throw new APIError('Election has already commenced', StatusCodes.BAD_REQUEST);
  } else if (election.contestants.includes(contestantID)) {
    logger.error('Contestant already registered for this election');
    throw new APIError('Contestant already registered for this election', StatusCodes.BAD_REQUEST);
  }

  // add contestant to election
  election.contestants.push(contestantID);
  await election.save();

  // update contestant's participating election
  contestant.election = id;
  await contestant.save();

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
  const { error } = validateElectionContestant(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;
  const { contestantID } = req.body;

  // check if contestant exists
  const contestant = await Contestant.findById(contestantID);
  if (!contestant) {
    logger.error('Contestant not found');
    throw new APIError('Contestant not found', StatusCodes.NOT_FOUND);
  }

  // check if election exists, has not started and contestant is registered
  const election = await Election.findById(id);
  if (!election) {
    logger.error('Election not found');
    throw new APIError('Election not found', StatusCodes.NOT_FOUND);
  } else if (election.hasStarted) {
    logger.error('Election has already commenced');
    throw new APIError('Election has already commenced', StatusCodes.BAD_REQUEST);
  } else if (!election.contestants.includes(contestantID)) {
    logger.error('Contestant already removed from this election');
    throw new APIError('Contestant already removed from this election', StatusCodes.BAD_REQUEST);
  }

  // remove contestant from election
  election.contestants = election.contestants.filter(contestant => contestant != contestantID);
  await election.save();

  // remove contestant's election if still a participant
  if (contestant.election == id) {
    contestant.set('election', undefined);
    await contestant.save();
  }

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
  addElection: asyncHandler(addElection),
  getElections: asyncHandler(getElections),
  addContestant: asyncHandler(addContestant),
  updateElection: asyncHandler(updateElection),
  deleteElection: asyncHandler(deleteElection),
  getUserElections: asyncHandler(getUserElections),
  removeContestant: asyncHandler(removeContestant),
};
