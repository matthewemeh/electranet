const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const Log = require('../models/log.model');
const { logger } = require('../utils/logger.utils');
const { APIError } = require('../middlewares/error.middlewares');
const { validateGetLogs } = require('../utils/validation.utils');
const { getLogsKey, redisCacheExpiry } = require('../utils/redis.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getLogs = async (req, res) => {
  logger.info('Get logs endpoint called');

  // validate request query
  const { error, value: reqQuery } = validateGetLogs(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { page, limit, sortBy, startTime, endTime } = reqQuery;

  // check cache for logs
  const logsCacheKey = getLogsKey(page, limit, sortBy, startTime, endTime);
  let paginatedLogs = await req.redisClient.get(logsCacheKey);
  if (paginatedLogs) {
    logger.info('Logs fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedLogs),
      message: 'Logs fetched successfully',
    });
  }

  // fallback to DB
  const paginationFilters = {};
  if (startTime || endTime) {
    paginationFilters.$and = [];
    if (startTime) {
      paginationFilters.$and.push({ createdAt: { $gte: startTime } });
    }
    if (endTime) {
      paginationFilters.$and.push({ createdAt: { $lte: endTime } });
    }
  }

  const sort = sortBy ? JSON.parse(sortBy) : { createdAt: -1 };
  paginatedLogs = await Log.paginate(paginationFilters, {
    sort,
    page,
    limit,
    select: '-updatedAt -__v',
    populate: { path: 'user', select: 'firstName middleName lastName email.value -_id' },
  });

  // cache fetched logs
  await req.redisClient.setex(logsCacheKey, redisCacheExpiry, JSON.stringify(paginatedLogs));

  logger.info('Logs fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Logs fetched successfully', data: paginatedLogs });
};

module.exports = { getLogs };
