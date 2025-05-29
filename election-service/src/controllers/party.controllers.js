const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const Log = require('../models/log.model');
const Party = require('../models/party.model');
const { logger } = require('../utils/logger.utils');
const { redisCacheExpiry, getPartiesKey } = require('../utils/redis.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');
const {
  validateParty,
  validateGetParties,
  validatePartyUpdate,
} = require('../utils/validation.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const addParty = async (req, res) => {
  logger.info('Add Party endpoint called');

  // validate request body
  const { error } = validateParty(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  // proceed to create party
  const party = await Party.create(req.body);

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
  const { error } = validatePartyUpdate(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;

  // proceed to update party
  const party = await Party.findByIdAndUpdate(id, req.body);
  if (!party) {
    logger.error('Party not found');
    throw new APIError('Party not found', StatusCodes.NOT_FOUND);
  }

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
  logger.info('Edit Party endpoint called');

  // validate request query
  const { error } = validateGetParties(req.query);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  let parties, partiesKey;

  // check if request is for pagination
  let { page, limit } = req.query;
  if (page || limit) {
    page = Number(page ?? 1);
    limit = Number(limit ?? 10);

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
  parties = await Party.find({}).sort({ longName: 1 });

  // cache parties
  await req.redisClient.setex(partiesKey, redisCacheExpiry, JSON.stringify(parties));

  logger.info('Parties fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Parties fetched successfully', data: parties });
};

module.exports = {
  addParty: asyncHandler(addParty),
  getParties: asyncHandler(getParties),
  updateParty: asyncHandler(updateParty),
};
