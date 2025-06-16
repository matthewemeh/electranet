const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const { sendOTP } = require('../utils/otp.utils');
const { logger } = require('../utils/logger.utils');
const { validateSendOTP } = require('../utils/validation.utils');
const { APIError } = require('../middlewares/error.middlewares');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const sendOtp = async (req, res) => {
  logger.info('Send OTP endpoint called');

  // validate the request body
  const { error, value: reqBody } = validateSendOTP(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { email, subject, duration } = reqBody;
  await sendOTP(email, subject, req.redisClient, duration);

  logger.info('OTP sent successfully');
  res.status(StatusCodes.OK).json({ success: true, message: 'OTP sent successfully', data: null });
};

module.exports = { sendOtp };
