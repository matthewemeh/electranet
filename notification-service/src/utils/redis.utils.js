const { Redis } = require('ioredis');
const { Model } = require('mongoose');

// cache expiry period in seconds
const redisCacheExpiry = Number(process.env.REDIS_CACHE_EXPIRY) || 300;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} user key in a standard pattern
 */
const getUserKey = (...values) => `user:${values.join(':')}`;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} logs key in a standard pattern
 */
const getLogsKey = (...values) => `logs:${values.join(':')}`;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} logs key in a standard pattern
 */
const getNotificationsKey = (...values) => `notifications:${values.join(':')}`;

/**
 * @param {Array<string | number>} values unique values to be used in key. The order of the arguments affects the key!!!
 * @returns {string} admin token key in a standard pattern
 */
const getAdminTokenKey = (...values) => `admin-token:${values.join(':')}`;

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

module.exports = {
  fetchData,
  getLogsKey,
  getUserKey,
  deleteCacheKey,
  getAdminTokenKey,
  redisCacheExpiry,
  getNotificationsKey,
};
