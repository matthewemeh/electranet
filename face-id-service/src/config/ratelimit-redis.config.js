const { Redis } = require('ioredis');
const { RateLimiterRedis } = require('rate-limiter-flexible');

const { logger } = require('../utils/logger.utils');

/**
 * @param {Redis} redisClient
 */
const configureRatelimitRedis = redisClient => {
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10, // user/client/IP address can make 10 requests...
    duration: 60, // ...in 60 seconds
  });

  return (req, res, next) => {
    rateLimiter
      .consume(req.ip)
      .then(() => next())
      .catch(() => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({ success: false, message: 'Too many requests', data: null });
      });
  };
};

module.exports = { configureRatelimitRedis };
