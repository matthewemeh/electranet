const express = require('express');

const { sendOTP } = require('../utils/otp.utils');
const { logger } = require('../utils/logger.utils');
const { validateSendOTP } = require('../utils/validation.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
const sendOtp = async (req, res) => {
  logger.info('Send OTP endpoint called');

  // validate the request body
  const { error } = validateSendOTP(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, 400);
  }

  const { email, subject, duration } = req.body;
  await sendOTP(email, subject, req.redisClient, duration);

  logger.info('OTP sent successfully');
  res.status(200).json({ success: true, message: 'OTP sent successfully', data: null });
};

module.exports = {
  sendOtp: asyncHandler(sendOtp),
};
