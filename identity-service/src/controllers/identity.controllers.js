const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const User = require('../models/user.model');
const { logger } = require('../utils/logger.utils');
const { encrypt } = require('../utils/encrypt.utils');
const { generateTokens } = require('../utils/token.utils');
const RefreshToken = require('../models/refresh-token.model');
const { APIError } = require('../middlewares/error.middlewares');
const { fetchData, getUserKey } = require('../utils/redis.utils');
const {
  validateLogin,
  validateLogout,
  validateRefreshToken,
} = require('../utils/validation.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const login = async (req, res) => {
  logger.info('Login endpoint called');

  const { error, value: reqBody } = validateLogin(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { email, password } = reqBody;

  const userCacheKey = getUserKey(email);
  const user = await fetchData(userCacheKey, { 'email.value': email }, User, req.redisClient);
  if (!user) {
    logger.error('User not found');
    throw new APIError('User not found', StatusCodes.NOT_FOUND);
  }

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    logger.error('Invalid password');
    throw new APIError('Invalid password', StatusCodes.UNAUTHORIZED);
  }

  const tokens = await generateTokens(user);

  logger.info('Login successful');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Login successful', data: { user, tokens } });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getRefreshToken = async (req, res) => {
  logger.info('Refresh Token endpoint called');

  const { error, value: reqBody } = validateRefreshToken(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const refreshToken = encrypt(reqBody.refreshToken);

  // check if token exists and hasn't expired
  const token = await RefreshToken.findOne({ token: refreshToken }).populate('user');
  if (!token || token.expiresAt < Date.now()) {
    logger.error('Inavlid or expired refresh token');
    throw new APIError('Inavlid or expired refresh token', StatusCodes.BAD_REQUEST);
  }

  // check if user exists
  if (!token.user) {
    logger.error('User not found');
    throw new APIError('User not found', StatusCodes.NOT_FOUND);
  }

  const tokens = await generateTokens(token.user);

  // delete old refresh token
  await RefreshToken.deleteOne({ _id: token._id });

  logger.info('Token refresh successful');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Token refresh successful', data: tokens });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const logout = async (req, res) => {
  logger.info('Logout endpoint called');

  const { error, value: reqBody } = validateLogout(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const refreshToken = encrypt(reqBody.refreshToken);

  const result = await RefreshToken.deleteOne({ token: refreshToken });
  if (!result.deletedCount) {
    logger.error('Invalid refresh token');
    throw new APIError('Invalid refresh token', StatusCodes.BAD_REQUEST);
  }

  logger.info('Logout successful');
  res.status(StatusCodes.OK).json({ success: true, message: 'Logout successful', data: null });
};

module.exports = { login, logout, getRefreshToken };
