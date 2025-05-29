const moment = require('moment');
const express = require('express');
const { Redis } = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { hash, verify } = require('argon2');
const { StatusCodes } = require('http-status-codes');

const User = require('../models/user.model');
const { logger } = require('../utils/logger.utils');
const { sendOTP, verifyOTP } = require('../utils/otp.utils');
const RefreshToken = require('../models/refresh-token.model');
const { sendNotification } = require('../utils/notification.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');
const {
  validateVerifyOTP,
  validateResetPassword,
  validateForgotPasswordInitiate,
} = require('../utils/validation.utils');
const {
  fetchData,
  getUserKey,
  getTokenKey,
  deleteCacheKey,
  redisCacheExpiry,
} = require('../utils/redis.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const forgotPasswordInitiate = async (req, res) => {
  logger.info('Forgot Password Initiation endpoint called');

  // validate the request body
  const { error } = validateForgotPasswordInitiate(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { email } = req.body;

  // check if user exists
  const userCacheKey = getUserKey(email);
  const user = await fetchData(userCacheKey, { 'email.value': email }, User, req.redisClient);
  if (!user) {
    logger.error('User not found');
    throw new APIError('User not found', StatusCodes.NOT_FOUND);
  }

  // send OTP to user
  await sendOTP(email, 'ELECTRANET: Forgot Password', req.redisClient);

  logger.info('Password reset initiated successfully');
  res.status(StatusCodes.OK).json({
    data: null,
    success: true,
    message: 'Password reset initiated successfully; proceed to validate OTP',
  });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const verifyOtp = async (req, res) => {
  logger.info('Forgot Password OTP Verification endpoint called');

  // validate the request body
  const { error } = validateVerifyOTP(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { email, otp } = req.body;

  // check if user exists
  const userCacheKey = getUserKey(email);
  const user = await fetchData(userCacheKey, { 'email.value': email }, User, req.redisClient);
  if (!user) {
    logger.error('User not found');
    throw new APIError('User not found', StatusCodes.NOT_FOUND);
  }

  const isOtpValid = await verifyOTP(email, otp, req.redisClient);
  if (!isOtpValid) {
    logger.error('Invalid OTP!');
    throw new APIError('Invalid OTP!', StatusCodes.FORBIDDEN);
  }

  // generate reset token for user and store in cache
  const resetToken = uuidv4();
  const token = await hash(resetToken);
  const tokenCacheKey = getTokenKey(email);
  await req.redisClient.setex(tokenCacheKey, redisCacheExpiry, token);

  logger.info('OTP verification successful');
  res.status(StatusCodes.OK).json({
    success: true,
    data: { email, resetToken },
    message: 'OTP verification successful',
  });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const resetPassword = async (req, res) => {
  logger.info('Reset Password endpoint called');

  // validate the request body
  const { error } = validateResetPassword(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { email, password, resetToken } = req.body;

  // fetch reset token record from cache
  const tokenCacheKey = getTokenKey(email);
  let token = await req.redisClient.get(tokenCacheKey);
  if (!token) {
    logger.error('Reset token expired');
    throw new APIError('Reset token expired', StatusCodes.NOT_FOUND);
  }

  const resetTokenMatches = await verify(token, resetToken);
  if (!resetTokenMatches) {
    logger.error('Invalid reset token!');
    throw new APIError('Invalid reset token!', StatusCodes.FORBIDDEN);
  }

  // check if user exists
  const userCacheKey = getUserKey(email);
  const user = await fetchData(userCacheKey, { 'email.value': email }, User, req.redisClient);
  if (!user) {
    logger.error('User not found');
    throw new APIError('User not found', StatusCodes.NOT_FOUND);
  }

  // reset (update) user's password
  user.password = password;
  await user.save();

  // cache updated user details
  await req.redisClient.setex(userCacheKey, redisCacheExpiry, JSON.stringify(user.toRaw()));

  // delete any existing refresh token(s) from DB to invalidate any existing session(s)
  await RefreshToken.deleteMany({ user: user._id });

  // delete reset token record from cache
  await deleteCacheKey(tokenCacheKey, req.redisClient);

  await sendNotification({
    user,
    notifyEmail: true,
    subject: 'ELECTRANET: Password Reset Successful',
    message: `Your password has been reset successfully on ${moment(user.updatedAt).format('LLL')}`,
  });

  logger.info('Password reset successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Password reset successfully', data: null });
};

module.exports = {
  verifyOtp: asyncHandler(verifyOtp),
  resetPassword: asyncHandler(resetPassword),
  forgotPasswordInitiate: asyncHandler(forgotPasswordInitiate),
};
