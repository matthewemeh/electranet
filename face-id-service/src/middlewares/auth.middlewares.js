const express = require('express');
const { Redis } = require('ioredis');
const { verify } = require('jsonwebtoken');

const { ROLES } = require('../constants');
const User = require('../models/user.model');
const { logger } = require('../utils/logger.utils');
const { asyncHandler, APIError } = require('./error.middlewares');
const { fetchData, getUserKey } = require('../utils/redis.utils');

/**
 * This middleware is used to ensure requests originate from trusted sources, applications or domains
 * This is an alternative to using the cors package
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const validateAuthKey = (req, res, next) => {
  const authKey = req.headers['x-auth-key'];

  if (!authKey || authKey !== process.env.AUTH_KEY) {
    logger.warn('Unauthorized Request!');
    throw new APIError('Unauthorized Request!', 407);
  }

  next();
};

/**
 * This middleware is used to ensure that a user (of any role) has been authenticated via login credentials
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    logger.error('An authorization token is required');
    throw new APIError('An authorization token is required', 401);
  }

  let decodedUser;
  try {
    decodedUser = verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.error('Session expired', error);
    throw new APIError('Session expired', 403);
  }

  const userCacheKey = getUserKey(decodedUser.email);
  const user = await fetchData(
    userCacheKey,
    { 'email.value': decodedUser.email },
    User,
    req.redisClient
  );
  if (!user) {
    logger.error('User not found');
    throw new APIError('User not found', 404);
  } else if (!user.email.verified) {
    logger.error('User has not verified email address');
    throw new APIError('User has not verified email address', 400);
  }

  req.user = user;

  next();
};

/**
 * This middleware restricts a resource to USERs only
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const verifyUser = async (req, res, next) => {
  if (req.user.role !== ROLES.USER) {
    throw new APIError('Only users can access this resource!', 403);
  }

  next();
};

module.exports = {
  verifyUser: asyncHandler(verifyUser),
  verifyToken: asyncHandler(verifyToken),
  validateAuthKey: asyncHandler(validateAuthKey),
};
