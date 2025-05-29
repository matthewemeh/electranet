const { StatusCodes } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');

const urlVersioning = version => (req, res, next) => {
  if (req.path.startsWith(`/${version}`)) {
    next();
  } else {
    logger.error('API version is not supported');
    res
      .status(StatusCodes.NOT_FOUND)
      .json({ errors: null, success: false, message: 'API version is not supported' });
  }
};

module.exports = { urlVersioning };
