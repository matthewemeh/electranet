const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const supabase = require('../services/supabase');
const { USER_IMAGE_KEY } = require('../constants');
const { verifyOTP } = require('../utils/otp.utils');
const { logger } = require('../utils/logger.utils');
const { APIError } = require('../middlewares/error.middlewares');
const { getUserFaceImageKey } = require('../utils/face-id.utils');
const { getUserKey, getFaceIdKey, redisCacheExpiry } = require('../utils/redis.utils');

const { SUPABASE_BUCKET_NAME } = process.env;

/**
 * register user's facial data on remote service
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const registerFace = async (req, res) => {
  logger.info('Facial Data Registration endpoint called');

  const { user } = req;
  const { otp } = req.body;
  const image = req.files?.find(({ fieldname }) => fieldname === USER_IMAGE_KEY);

  // validate the request body
  if (!image) {
    logger.warn('Validation error', {
      message: `"${USER_IMAGE_KEY}" is missing in Multipart form data`,
    });
    throw new APIError(
      `"${USER_IMAGE_KEY}" is missing in Multipart form data`,
      StatusCodes.BAD_REQUEST
    );
  } else if (!otp) {
    logger.warn('Validation error', { message: '"otp" is required' });
    throw new APIError('"otp" is required', StatusCodes.BAD_REQUEST);
  }

  const isValidOTP = await verifyOTP(user.email.value, otp, req.redisClient);
  if (!isValidOTP) {
    logger.error('Invalid OTP');
    throw new APIError('Invalid OTP', StatusCodes.BAD_REQUEST);
  }

  const filePath = getUserFaceImageKey(user._id);

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .upload(filePath, image.buffer, {
      contentType: image.mimetype,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  // user now has facial data registered
  if (!user.faceID) {
    user.faceID = true;
    await user.save();

    // update cached user data
    const userCacheKey = getUserKey(user.email.value);
    await req.redisClient.setex(userCacheKey, redisCacheExpiry, JSON.stringify(user.toRaw()));
  }

  logger.info('User facial data registered successfully');
  res
    .status(StatusCodes.CREATED)
    .json({ success: true, message: 'User facial data registered successfully', data: null });
};

/**
 * fetch user's face ID
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const fetchUserFaceID = async (req, res) => {
  logger.info('Face ID Fetch endpoint called');

  const { user } = req;
  const filePath = getUserFaceImageKey(user._id);

  if (!user.faceID) {
    logger.error('User has not registered Face ID');
    throw new APIError('User has not registered Face ID', StatusCodes.BAD_REQUEST);
  }

  const faceIdKey = getFaceIdKey(user._id);
  const cachedFaceId = await req.redisClient.get(faceIdKey);
  if (cachedFaceId) {
    logger.info('Face ID fetched successfully from cache');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(cachedFaceId),
      message: 'Face ID fetched successfully',
    });
  }

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET_NAME)
    .createSignedUrl(filePath, redisCacheExpiry);

  if (error) {
    throw error;
  }

  await req.redisClient.setex(faceIdKey, redisCacheExpiry, JSON.stringify(data));

  logger.info('Face ID fetched successfully');
  res.status(StatusCodes.OK).json({ success: true, message: 'Face ID fetched successfully', data });
};

module.exports = { registerFace, fetchUserFaceID };
