const rateLimit = require('express-rate-limit');

const limiter = (maxRequests, time) => {
  return rateLimit({
    windowMs: time,
    max: maxRequests,
    legacyHeaders: false,
    standardHeaders: true,
    message: 'Too many requests, please try again later',
  });
};

module.exports = { limiter };
