const { Redis } = require('ioredis');
const { Model } = require('mongoose');

const { logger } = require('./logger.utils');

// cache expiry period in seconds
const redisCacheExpiry = Number(process.env.REDIS_CACHE_EXPIRY) || 300;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} user key in a standard pattern
 */
const getUserKey = (...values) => `user:${values.join(':')}`;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} users key in a standard pattern
 */
const getUsersKey = (...values) => `users:${values.join(':')}`;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} OTP key in a standard pattern
 */
const getOtpKey = (...values) => `otp:${values.join(':')}`;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} token key in a standard pattern
 */
const getTokenKey = (...values) => `token:${values.join(':')}`;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} admin token key in a standard pattern
 */
const getAdminTokenKey = (...values) => `admin-token:${values.join(':')}`;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} admin tokens key in a standard pattern
 */
const getAdminTokensKey = (...values) => `admin-tokens:${values.join(':')}`;

/**
 * This function checks Redis cache before checking the database for requested object
 * @param {string} cacheKey the cached data's key
 * @param {object} searchQuery the fields to query the database if cache is not found
 * @param {Model} DataModel the defined mongoose model that'll be used to query database if cache is not found.
 * @param {Redis} redisClient the redis client used to get and set cache
 * @returns {Promise<object | null>} the fetched data Model object or null
 */
const fetchData = async (cacheKey, searchQuery, DataModel, redisClient) => {
  // Try Redis cache
  let data = await redisClient.get(cacheKey);
  if (data) {
    data = new DataModel(JSON.parse(data));
    data.isNew = false;
  } else {
    // Fallback to DB
    data = await DataModel.findOne(searchQuery);
    if (data) {
      const dataObject = data.toObject({ transform: false });
      // cache fetched details
      await redisClient.setex(cacheKey, redisCacheExpiry, JSON.stringify(dataObject));
    }
  }

  return data;
};

/**
 * @param {string} cacheKey the cached key to be deleted
 * @param {Redis} redisClient the redis client used to delete cache
 * @returns {Promise<void>}
 */
const deleteCacheKey = async (cacheKey, redisClient) => {
  await redisClient.unlink(cacheKey);
};

/**
 * Fire-and-forget: delete all Redis keys matching a given pattern
 * @param {string} pattern The key pattern (e.g., "admin-tokens:*")
 * @param {Redis} redisClient The redis client
 */
const deleteCachePatternAsync = (pattern, redisClient, keysPerBatch = 1000) => {
  (async () => {
    try {
      let cursor = '0';
      do {
        const [newCursor, keys] = await redisClient.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          keysPerBatch
        );
        cursor = newCursor;

        if (keys.length > 0) {
          await redisClient.unlink(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      logger.error(`Error cleaning cache for pattern "${pattern}":`, err);
    }
  })();
};

module.exports = {
  fetchData,
  getOtpKey,
  getUserKey,
  getUsersKey,
  getTokenKey,
  deleteCacheKey,
  getAdminTokenKey,
  redisCacheExpiry,
  getAdminTokensKey,
  deleteCachePatternAsync,
};
