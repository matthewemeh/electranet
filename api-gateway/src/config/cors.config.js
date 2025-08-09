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
  const apiKey = req.headers['x-api-key'];

  cors({
    origin: (origin, callback) => {
      // Split whitelisted domains across separators like: ", " or " ," or "," or " "
      const allowedOrigins = process.env.WHITELISTED_DOMAINS.split(/ ?\, ?| /g);
      const isDevelopment = process.env.NODE_ENV === 'development';

      // if request is made in development or in production with correct API key or from an allowed origin , allow it
      const isRequestAllowed =
        isDevelopment ||
        (origin && allowedOrigins.includes(origin)) ||
        (!origin && apiKey && apiKey === process.env.API_KEY);

      if (isRequestAllowed) {
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
