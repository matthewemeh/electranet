const { Redis } = require('ioredis');
const { hash, verify } = require('argon2');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('./logger.utils');
const { sendEmail } = require('./email.utils');
const { getOtpKey, deleteCacheKey } = require('./redis.utils');
const { APIError } = require('../middlewares/error.middlewares');

const generateOTP = () => `${Math.floor(100_000 + Math.random() * 900_000)}`;

/**
 * @param {string} email the email to be addressed the OTP
 * @param {string} subject the subject of the addressed email
 * @param {Redis} redisClient the redis client instance
 * @param {number} duration the validity period of the OTP in minutes
 */
const sendOTP = async (email, subject, redisClient, duration = 5) => {
  const generatedOTP = generateOTP();

  const html = `<p>Hello from Electranet! To complete your ongoing authentication process, please enter the OTP below.</p>
    <strong style="font-size:25px;letter-spacing:2px">${generatedOTP}</strong>
    <p>This code expires in ${duration} minute(s).</p>
    <p>If you did not initiate the process that sent this email, please disregard this email. Your privacy is important to us.</p>
    <p>Best regards,<span style="display:block">Electranet.</span></p>
    `;

  // save otp record in cache
  const otpCacheKey = getOtpKey(email);
  const hashedOTP = await hash(generatedOTP);
  await redisClient.setex(otpCacheKey, duration * 60, hashedOTP);

  // send email
  await sendEmail(email, subject, null, html);
};

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

module.exports = { generateOTP, sendOTP, verifyOTP };
