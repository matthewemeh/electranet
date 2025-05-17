const { Redis } = require('ioredis');

/**
 * @param {Redis} redisClient
 */
const useRedis = redisClient => {
  return (req, res, next) => {
    req.redisClient = redisClient;
    next();
  };
};

module.exports = { useRedis };
