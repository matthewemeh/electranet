const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

require('../models/party.model');
require('../models/election.model');
require('../models/contestant.model');
const Result = require('../models/result.model');
const { logger } = require('../utils/logger.utils');
const { asyncHandler } = require('../middlewares/error.middlewares');
const { getResultsKey, redisCacheExpiry } = require('../utils/redis.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getResults = async (req, res) => {
  logger.info('Get Results endpoint called');

  const { id } = req.params;

  // check cached results
  const resultKey = getResultsKey(id);
  let results = await req.redisClient.get(resultKey);
  if (results) {
    logger.info('Results fetched successfully');
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: 'Results fetched successfully', data: JSON.parse(results) });
  }

  // fallback to DB
  results = await Result.findOne({ election: id })
    .select('-_id -__v')
    .populate([
      { path: 'election', select: 'name delimitationCode -_id' },
      { path: 'results.party', select: 'longName shortName logoUrl -_id' },
      { path: 'results.contestants', select: 'firstName lastName profileImageUrl -_id' },
    ]);

  // cache fetched results
  await req.redisClient.setex(resultKey, redisCacheExpiry, JSON.stringify(results));

  logger.info('Results fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Results fetched successfully', data: results });
};

module.exports = { getResults: asyncHandler(getResults) };
