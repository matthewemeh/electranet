const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

require('../models/party.model');
require('../models/election.model');
require('../models/contestant.model');
const Result = require('../models/result.model');
const { logger } = require('../utils/logger.utils');
const { APIError } = require('../middlewares/error.middlewares');
const { validateGetResults } = require('../utils/validation.utils');
const { getResultsKey, getResultKey, redisCacheExpiry } = require('../utils/redis.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getResults = async (req, res) => {
  logger.info('Get Results endpoint called');

  // validate request query
  const { error, value: reqQuery } = validateGetResults(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { page, limit, sortBy, startTime, endTime } = reqQuery;

  // check cached results
  const resultsCacheKey = getResultsKey(page, limit, sortBy, startTime, endTime);
  let paginatedResults = await req.redisClient.get(resultsCacheKey);
  if (paginatedResults) {
    logger.info('Results fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedResults),
      message: 'Results fetched successfully',
    });
  }

  // fallback to DB
  const paginationFilters = { $and: [] };
  if (startTime) {
    paginationFilters.$and.push({ createdAt: { $gte: startTime } });
  }
  if (endTime) {
    paginationFilters.$and.push({ createdAt: { $lte: endTime } });
  }
  if (paginationFilters.$and.length === 0) {
    delete paginationFilters.$and;
  }

  const sort = sortBy ? JSON.parse(sortBy) : { createdAt: -1 };
  paginatedResults = await Result.paginate(paginationFilters, {
    sort,
    page,
    limit,
    select: 'election updatedAt results.votes',
    populate: { path: 'election', select: 'name delimitationCode' },
  });

  // cache fetched results
  await req.redisClient.setex(resultsCacheKey, redisCacheExpiry, JSON.stringify(paginatedResults));

  logger.info('Results fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Results fetched successfully', data: paginatedResults });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getResult = async (req, res) => {
  logger.info('Get Result endpoint called');

  const { id } = req.params;

  // check cached result
  const resultKey = getResultKey(id);
  let result = await req.redisClient.get(resultKey);
  if (result) {
    logger.info('Result fetched successfully');
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: 'Result fetched successfully', data: JSON.parse(result) });
  }

  // fallback to DB
  result = await Result.findOne({ election: id })
    .select('-_id -__v')
    .populate([
      { path: 'election', select: 'name delimitationCode -_id' },
      { path: 'results.party', select: 'longName shortName logoUrl -_id' },
      { path: 'results.contestants', select: '-party -createdAt -updatedAt -__v' },
    ]);
  if (!result) {
    logger.error('Result not found');
    throw new APIError('Result not found', StatusCodes.NOT_FOUND);
  }

  // cache fetched results
  await req.redisClient.setex(resultKey, redisCacheExpiry, JSON.stringify(result));

  logger.info('Result fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Result fetched successfully', data: result });
};

module.exports = { getResults, getResult };
