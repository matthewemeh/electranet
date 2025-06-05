const express = require('express');
const { Redis } = require('ioredis');
const { verify } = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');

const { ROLES } = require('../constants');
const User = require('../models/user.model');
const { logger } = require('../utils/logger.utils');
const AdminToken = require('../models/admin-token.model');
const { asyncHandler, APIError } = require('./error.middlewares');
const { fetchData, getAdminTokenKey, getUserKey } = require('../utils/redis.utils');

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
    throw new APIError('Unauthorized Request!', StatusCodes.PROXY_AUTHENTICATION_REQUIRED);
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
    throw new APIError('An authorization token is required', StatusCodes.UNAUTHORIZED);
  }

  let decodedUser;
  try {
    decodedUser = verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.error('Session expired', error);
    throw new APIError('Session expired', StatusCodes.UNAUTHORIZED);
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
    throw new APIError('User not found', StatusCodes.NOT_FOUND);
  } else if (!user.email.verified) {
    logger.error('User has not verified email address');
    throw new APIError('User has not verified email address', StatusCodes.BAD_REQUEST);
  }

  req.user = user;

  next();
};

/**
 * This middleware allows ONLY ADMINs (who have active admin rights) and SUPER_ADMINs to access a resource
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const verifyAdminToken = async (req, res, next) => {
  const { _id, role } = req.user;

  // allow Super Admin through but block users
  if (role === ROLES.SUPER_ADMIN) {
    return next();
  } else if (role === ROLES.USER) {
    logger.error('Unauthorized access!');
    throw new APIError('Unauthorized access!', StatusCodes.FORBIDDEN);
  }

  // check if admin token record exists, is active and hasn't expired
  const adminTokenCacheKey = getAdminTokenKey(_id);
  const adminToken = await fetchData(
    adminTokenCacheKey,
    { user: _id },
    AdminToken,
    req.redisClient
  );
  if (!adminToken) {
    logger.error('No admin rights available. Request rights from Super-Admin');
    throw new APIError(
      'No admin rights available. Request rights from Super-Admin',
      StatusCodes.FORBIDDEN
    );
  } else if (!adminToken.isActive) {
    logger.error('Admin rights are not active');
    throw new APIError('Admin rights are not active', StatusCodes.FORBIDDEN);
  } else if (adminToken.hasExpired) {
    logger.error('Admin rights have expired. Contact Super-Admin for access renewal');
    throw new APIError(
      'Admin rights have expired. Contact Super-Admin for access renewal',
      StatusCodes.FORBIDDEN
    );
  }

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
    throw new APIError('Only users can access this resource!', StatusCodes.FORBIDDEN);
  }

  next();
};

module.exports = {
  verifyUser: asyncHandler(verifyUser),
  verifyToken: asyncHandler(verifyToken),
  validateAuthKey: asyncHandler(validateAuthKey),
  verifyAdminToken: asyncHandler(verifyAdminToken),
};
