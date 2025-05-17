const express = require('express');
const { verify } = require('jsonwebtoken');

const User = require('../models/user.model');
const { logger } = require('../utils/logger.utils');
const AdminToken = require('../models/admin-token.model');
const { ROLES, ADMIN_TOKEN_STATUSES } = require('../constants');
const { asyncHandler, APIError } = require('./error.middlewares');
const { fetchData, getAdminTokenKey, getUserKey } = require('../utils/redis.utils');

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn('Unauthorized Request!');
    throw new APIError('Unauthorized Request!', 407);
  }

  next();
};

/**
 * @param {express.Request} req
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
 * @param {express.Request} req
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
    throw new APIError('Unauthorized access!', 403);
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
    throw new APIError('No admin rights available. Request rights from Super-Admin', 403);
  } else if (adminToken.statusCode !== ADMIN_TOKEN_STATUSES.ACTIVE) {
    logger.error('Admin rights are not active');
    throw new APIError('Admin rights are not active', 403);
  } else if (adminToken.expiresAt < Date.now()) {
    logger.error('Admin rights have expired. Contact Super-Admin for access renewal');
    throw new APIError('Admin rights have expired. Contact Super-Admin for access renewal', 403);
  }

  next();
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const verifySuperAdmin = async (req, res, next) => {
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    logger.error('Unauthorized access!');
    throw new APIError('Unauthorized access!', 403);
  }

  next();
};

module.exports = {
  verifyToken: asyncHandler(verifyToken),
  validateApiKey: asyncHandler(validateApiKey),
  verifyAdminToken: asyncHandler(verifyAdminToken),
  verifySuperAdmin: asyncHandler(verifySuperAdmin),
};
