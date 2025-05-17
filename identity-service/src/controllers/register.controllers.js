const express = require('express');

const { ROLES } = require('../constants');
const User = require('../models/user.model');
const { logger } = require('../utils/logger.utils');
const { generateTokens } = require('../utils/token.utils');
const { sendOTP, verifyOTP } = require('../utils/otp.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');
const { getUserKey, redisCacheExpiry, fetchData } = require('../utils/redis.utils');
const {
  validateVerifyOTP,
  validateRegisterUser,
  validateRegisterAdmin,
} = require('../utils/validation.utils');

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
const registerUser = async (req, res) => {
  logger.info('Register User endpoint called');

  // validate the request body
  const { error } = validateRegisterUser(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, 400);
  }

  const { email, ...body } = req.body;

  // check if user already exists
  const userCacheKey = getUserKey(email);
  let user = await fetchData(userCacheKey, { 'email.value': email }, User, req.redisClient);
  if (user) {
    logger.error('User already exists');
    throw new APIError('User already exists', 409);
  }

  // check that super admin has registered
  const superAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (!superAdmin) {
    logger.warn('Super Admin must be registered');
    throw new APIError('Super Admin must be registered', 500);
  }

  // TODO: Integrate VIN verification using 3rd party API
  // If VIN verification is successful, then user registration can proceed
  // else, the process is terminated.

  user = await User.create({ ...body, role: ROLES.USER, email: { value: email } });
  const tokens = await generateTokens(user);

  // cache user details
  await req.redisClient.setex(userCacheKey, redisCacheExpiry, JSON.stringify(user.toRaw()));

  // send OTP to user
  await sendOTP(email, 'ELECTRANET: Verify Email', req.redisClient);

  logger.info('Registration successful');
  res.status(201).json({ success: true, message: 'Registration successful', data: tokens });
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
const registerAdmin = async (req, res) => {
  logger.info('Register Admin endpoint called');

  // validate the request body
  const { error } = validateRegisterAdmin(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, 400);
  }

  const { email, role, ...body } = req.body;

  // check if user already exists
  const userCacheKey = getUserKey(email);
  let user = await fetchData(userCacheKey, { 'email.value': email }, User, req.redisClient);
  if (user) {
    logger.error('User already exists');
    throw new APIError('User already exists', 409);
  }

  const superAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (superAdmin && role === ROLES.SUPER_ADMIN) {
    // check to ensure only 1 super-admin exists always
    logger.error('Super Admin already exists');
    throw new APIError('Super Admin already exists', 409);
  } else if (!superAdmin && role !== ROLES.SUPER_ADMIN) {
    // check that super admin has registered
    logger.warn('Super Admin must be registered');
    throw new APIError('Super Admin must be registered', 500);
  } else if (role === ROLES.SUPER_ADMIN && email !== process.env.SUPER_ADMIN_EMAIL) {
    // check that the registrant's email matches the expected super admin email
    logger.error('You are not the Super Admin. Please contact developer');
    throw new APIError('You are not the Super Admin. Please contact developer', 403);
  }

  user = await User.create({ ...body, role, email: { value: email } });
  const tokens = await generateTokens(user);

  // cache user details
  await req.redisClient.setex(userCacheKey, redisCacheExpiry, JSON.stringify(user.toRaw()));

  // send OTP to user
  await sendOTP(email, 'ELECTRANET: Verify Email', req.redisClient);

  logger.info('Registration successful');
  res.status(201).json({ success: true, message: 'Registration successful', data: tokens });
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
const verifyOtp = async (req, res) => {
  logger.info('Register OTP Verification endpoint called');

  // validate the request body
  const { error } = validateVerifyOTP(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, 400);
  }

  const { email, otp } = req.body;

  // check if user exists and has email verified
  const userCacheKey = getUserKey(email);
  const user = await fetchData(userCacheKey, { 'email.value': email }, User, req.redisClient);
  if (!user) {
    logger.error('User not found');
    throw new APIError('User not found', 404);
  } else if (user.email.verified) {
    logger.warn('User email is already verified!');
    return res
      .status(200)
      .json({ success: true, message: 'Email is already verified!', data: null });
  }

  const isOtpValid = await verifyOTP(email, otp, req.redisClient);
  if (!isOtpValid) {
    logger.error('Invalid OTP!');
    throw new APIError('Invalid OTP!', 403);
  }

  // verify user email
  user.email.verified = true;
  await user.save();

  // cache updated user details
  await req.redisClient.setex(userCacheKey, redisCacheExpiry, JSON.stringify(user.toRaw()));

  logger.info('Email verification successful');
  res.status(200).json({ success: true, message: 'Email verification successful', data: null });
};

module.exports = {
  verifyOtp: asyncHandler(verifyOtp),
  registerUser: asyncHandler(registerUser),
  registerAdmin: asyncHandler(registerAdmin),
};
