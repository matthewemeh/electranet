const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');
const Notification = require('../models/notification.model');
const { APIError } = require('../middlewares/error.middlewares');
const { validateGetNotifications } = require('../utils/validation.utils');
const { redisCacheExpiry, getNotificationsKey } = require('../utils/redis.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getNotifications = async (req, res) => {
  logger.info('Get notifications endpoint called');

  // validate request query
  const { error, value: reqQuery } = validateGetNotifications(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { user } = req;
  const { page, limit, sortBy, startTime, endTime } = reqQuery;

  // check cached notifications
  const notificationsCacheKey = getNotificationsKey(page, limit, sortBy, startTime, endTime);
  let paginatedNotifications = await req.redisClient.get(notificationsCacheKey);
  if (paginatedNotifications) {
    logger.info('Notifications fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedNotifications),
      message: 'Notifications fetched successfully',
    });
  }

  // fallback to DB
  const paginationFilters = { $and: [{ user: user._id }] };
  if (startTime) {
    paginationFilters.$and.push({ createdAt: { $gte: startTime } });
  }
  if (endTime) {
    paginationFilters.$and.push({ createdAt: { $lte: endTime } });
  }

  const sort = sortBy ? JSON.parse(sortBy) : { createdAt: -1 };
  paginatedNotifications = await Notification.paginate(paginationFilters, {
    sort,
    page,
    limit,
    select: '-user -updatedAt -__v',
  });

  // cache fetched notifications
  await req.redisClient.setex(
    notificationsCacheKey,
    redisCacheExpiry,
    JSON.stringify(paginatedNotifications)
  );

  logger.info('Notifications fetched successfully');
  res.status(StatusCodes.OK).json({
    success: true,
    data: paginatedNotifications,
    message: 'Notifications fetched successfully',
  });
};

module.exports = { getNotifications };
