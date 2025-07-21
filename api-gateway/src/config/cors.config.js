const cors = require('cors');

const { logger } = require('../utils/logger.utils');
const { StatusCodes } = require('http-status-codes');
const { APIError } = require('../middlewares/error.middlewares');

const configureCors = () => {
  return cors({
    origin: (origin, callback) => {
      // Split whitelisted domains across separators like: ", " or " ," or "," or " "
      const allowedOrigins = process.env.WHITELISTED_DOMAINS.split(/ ?\, ?| /g);
      const isDevelopment = process.env.NODE_ENV === 'development';

      // if request is from development, same origin or is whitelisted, allow it
      if (isDevelopment || !origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn('Not allowed by CORS');
        callback(new APIError('Not allowed by CORS', StatusCodes.FORBIDDEN));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });
};

module.exports = { configureCors };
