const { logger } = require('../utils/logger.utils');
const { asyncHandler, APIError } = require('./error.middlewares');

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn('Unauthorized Request!');
    throw new APIError('Unauthorized Request!', 407);
  }

  next();
};

module.exports = { validateApiKey: asyncHandler(validateApiKey) };
