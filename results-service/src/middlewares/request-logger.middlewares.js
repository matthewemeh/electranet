const { logger } = require('../utils/logger.utils');

const requestLogger = (req, res, next) => {
  const { body, method, url } = req;
  const timeStamp = new Date().toISOString();
  const userAgent = req.get('User-Agent');
  logger.info(`[${timeStamp}] ${method} ${url} - ${userAgent}`);
  logger.info(`Request body: ${JSON.stringify(body)}`);
  next();
};

module.exports = { requestLogger };
