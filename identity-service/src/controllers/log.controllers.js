const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const Log = require('../models/log.model');
const { logger } = require('../utils/logger.utils');
const { validateGetLogs } = require('../utils/validation.utils');
const { getLogsKey, redisCacheExpiry } = require('../utils/redis.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getLogs = async (req, res) => {
  logger.info('Get logs endpoint called');

  // validate request query
  const { error } = validateGetLogs(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { startTime, endTime } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  // check cache for logs
  const logsCacheKey = getLogsKey(page, limit, startTime, endTime);
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
  const paginationFilters = { $and: [] };
  if (startTime) {
    paginationFilters.$and.push({ createdAt: { $gte: new Date(startTime) } });
  }
  if (endTime) {
    paginationFilters.$and.push({ createdAt: { $lte: new Date(endTime) } });
  }

  paginatedLogs = await Log.paginate(paginationFilters, {
    page,
    limit,
    populate: 'user',
    sort: { createdAt: -1 },
  });

  // cache fetched logs
  await req.redisClient.setex(logsCacheKey, redisCacheExpiry, JSON.stringify(paginatedLogs));

  logger.info('Logs fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Logs fetched successfully', data: paginatedLogs });
};

module.exports = { getLogs: asyncHandler(getLogs) };
