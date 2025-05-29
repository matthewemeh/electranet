const { hash } = require('argon2');
const express = require('express');
const { Redis } = require('ioredis');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');
const { faceApi } = require('../services/facial-data.services');
const { USER_ID_KEY, USER_IMAGE_KEY } = require('../constants');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');
const { getFaceIdTokenKey, redisCacheExpiry } = require('../utils/redis.utils');

/**
 * register user's facial data on remote service
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const registerFace = async (req, res) => {
  logger.info('Facial Data Registration endpoint called');

  const { user } = req;
  const image = req.files?.find(({ fieldname }) => fieldname === USER_IMAGE_KEY)?.buffer;

  // validate the request body
  if (!image) {
    logger.warn('Validation error', {
      message: `"${USER_IMAGE_KEY}" is missing in Multipart form data`,
    });
    throw new APIError(
      `"${USER_IMAGE_KEY}" is missing in Multipart form data`,
      StatusCodes.BAD_REQUEST
    );
  }

  // setup multipart form data payload
  const formData = new FormData();
  formData.append(USER_ID_KEY, user._id.toString());
  formData.append(USER_IMAGE_KEY, image, { filename: `${uuidv4()}.png`, contentType: 'image/png' });

  // proceed to upload user facial data
  const response = await faceApi
    .post('/register', formData, { headers: formData.getHeaders() })
    .catch(error => ({ error }));

  if (response.error) {
    const { status, data } = response.error.response;
    logger.error('An error has occurred');
    throw new APIError('An error has occurred', status, data);
  }

  // user now has facial data registered
  user.faceID = true;
  await user.save();

  logger.info('User facial data registered successfully');
  res
    .status(StatusCodes.CREATED)
    .json({ success: true, message: 'User facial data registered successfully', data: null });
};

/**
 * verify user's facial data
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const verifyFace = async (req, res) => {
  logger.info('Face Verification endpoint called');

  const { user } = req;
  const image = req.files?.find(({ fieldname }) => fieldname === USER_IMAGE_KEY)?.buffer;

  if (!user.faceID) {
    logger.error('User has not registered Face ID', StatusCodes.FORBIDDEN);
    throw new APIError('User has not registered Face ID', StatusCodes.FORBIDDEN);
  }

  // validate the request body
  if (!image) {
    logger.warn('Validation error', {
      message: `"${USER_IMAGE_KEY}" is missing in Multipart form data`,
    });
    throw new APIError(
      `"${USER_IMAGE_KEY}" is missing in Multipart form data`,
      StatusCodes.BAD_REQUEST
    );
  }

  // setup multipart form data payload
  const formData = new FormData();
  formData.append(USER_ID_KEY, user._id.toString());
  formData.append(USER_IMAGE_KEY, image, { filename: `${uuidv4()}.png`, contentType: 'image/png' });

  // proceed to verify user facial data
  const response = await faceApi
    .post('/verify', formData, { headers: formData.getHeaders() })
    .catch(error => ({ error }));

  if (response.error) {
    const { status, data } = response.error.response;
    logger.error('An error has occurred');
    throw new APIError('An error has occurred', status, data);
  }

  // check if face verification failed
  const { status, confidence } = response.data.message;
  if (!status || confidence < 90) {
    logger.error('Face verification failed');
    throw new APIError('Face verification failed', StatusCodes.UNAUTHORIZED);
  }

  // generate and store a face id token for the verified face id
  const faceIdToken = uuidv4();
  const hashedFaceIdToken = await hash(faceIdToken);
  const faceIdTokenKey = getFaceIdTokenKey(user.email.value);
  await req.redisClient.setex(faceIdTokenKey, redisCacheExpiry, hashedFaceIdToken);

  logger.info('Face verified successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Face verified successfully', data: { faceIdToken } });
};

module.exports = {
  verifyFace: asyncHandler(verifyFace),
  registerFace: asyncHandler(registerFace),
};
