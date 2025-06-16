const { StatusCodes } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');
const { APIError } = require('./error.middlewares');

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn('Unauthorized Request!');
    throw new APIError('Unauthorized Request!', StatusCodes.PROXY_AUTHENTICATION_REQUIRED);
  }

  next();
};

module.exports = { validateApiKey };
