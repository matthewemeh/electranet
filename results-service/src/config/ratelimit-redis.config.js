const { Redis } = require('ioredis');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { StatusCodes, ReasonPhrases } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');

/**
 * @param {Redis} redisClient - redis client instance
 * @param {number} points - number of requests that can be made to redis client
 * @param {number} duration - the time window within which the requests are made (in seconds)
 */
const configureRatelimitRedis = (redisClient, points = 10, duration = 60) => {
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points,
    duration,
  });

  return (req, res, next) => {
    rateLimiter
      .consume(req.ip)
      .then(() => next())
      .catch(() => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res
          .status(StatusCodes.TOO_MANY_REQUESTS)
          .json({ success: false, message: ReasonPhrases.TOO_MANY_REQUESTS, data: null });
      });
  };
};

module.exports = { configureRatelimitRedis };
