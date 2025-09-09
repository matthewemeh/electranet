const { Redis } = require('ioredis');
const { verify } = require('argon2');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('./logger.utils');
const { getOtpKey, deleteCacheKey } = require('./redis.utils');
const { APIError } = require('../middlewares/error.middlewares');

/**
 * This function verifies an OTP and also deletes the cached OTP record after successful verification
 * @param {string} email
 * @param {string} otp the unhashed otp from user
 * @param {Redis} redisClient the redis client instance
 * @returns {Promise<boolean>}
 */
const verifyOTP = async (email, otp, redisClient) => {
  // check cache for OTP
  const otpCacheKey = getOtpKey(email);
  const hashedOTP = await redisClient.get(otpCacheKey);
  if (!hashedOTP) {
    logger.error('OTP has expired');
    throw new APIError('OTP has expired', StatusCodes.GONE);
  }

  const isOtpValid = await verify(hashedOTP, otp);

  if (isOtpValid) {
    // invalidate OTP cache
    await deleteCacheKey(otpCacheKey, redisClient);
  }

  return isOtpValid;
};

module.exports = { verifyOTP };
