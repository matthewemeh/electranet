const { Redis } = require('ioredis');
const { RedisStore } = require('rate-limit-redis');
const { rateLimit } = require('express-rate-limit');

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
    handler: (req, res) => {
      logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: 'Too many requests', data: null });
    },
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  });
};

module.exports = { configureRatelimit };
