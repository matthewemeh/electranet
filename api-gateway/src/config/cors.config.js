const cors = require('cors');
const express = require('express');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');
const { APIError } = require('../middlewares/error.middlewares');

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const configureCors = (req, res, next) => {
  const origin = req.headers.origin;
  const apiKey = req.headers['x-api-key'];
  const isProduction = process.env.NODE_ENV === 'production';

  // if request hits production (live) server without an origin and correct api key then block the request
  if (!origin && isProduction && (!apiKey || apiKey !== process.env.API_KEY)) {
    logger.warn('Not allowed by CORS');
    throw new APIError('Not allowed by CORS', StatusCodes.FORBIDDEN);
  }

  cors({
    origin: (origin, callback) => {
      // Split whitelisted domains across separators like: ", " or " ," or "," or " "
      const allowedOrigins = process.env.WHITELISTED_DOMAINS.split(/ ?\, ?| /g);

      // if request's origin is whitelisted, allow it
      if (!isProduction || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn('Not allowed by CORS');
        callback(new APIError('Not allowed by CORS', StatusCodes.FORBIDDEN));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })(req, res, next);
};

module.exports = { configureCors };
