const { Redis } = require('ioredis');
const { RedisStore } = require('rate-limit-redis');
const { rateLimit } = require('express-rate-limit');
const { StatusCodes, ReasonPhrases } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');

/**
 * @param {Redis} redisClient the instance of a redis client
 * @param {number} maxRequests the maximum number of requests per request window
 * @param {number} duration how long a request window lasts in milliseconds
 */
const configureRatelimit = (redisClient, maxRequests = 50, duration = 900_000) => {
  return rateLimit({
    max: maxRequests,
    windowMs: duration,
    legacyHeaders: false,
    standardHeaders: true,
    validate: { trustProxy: true, xForwardedForHeader: true },
    handler: (req, res) => {
      logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
      res
        .status(StatusCodes.TOO_MANY_REQUESTS)
        .json({ success: false, message: ReasonPhrases.TOO_MANY_REQUESTS, data: null });
    },
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  });
};

module.exports = { configureRatelimit };
