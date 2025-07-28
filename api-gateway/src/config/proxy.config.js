const proxy = require('express-http-proxy');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');

const {
  VOTE_SERVICE_URL,
  RESULTS_SERVICE_URL,
  FACE_ID_SERVICE_URL,
  ELECTION_SERVICE_URL,
  IDENTITY_SERVICE_URL,
  VOTE_SERVICE_AUTH_KEY,
  NOTIFICATION_SERVICE_URL,
  RESULTS_SERVICE_AUTH_KEY,
  FACE_ID_SERVICE_AUTH_KEY,
  ELECTION_SERVICE_AUTH_KEY,
  IDENTITY_SERVICE_AUTH_KEY,
  NOTIFICATION_SERVICE_AUTH_KEY,
} = process.env;

const proxyOptions = {
  proxyReqPathResolver: req => {
    return req.originalUrl.replace(/^\/v1/, '/api');
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error('Proxy error:', err.errors);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ errors: null, success: false, message: `Internal server error: ${err.code}` });
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    return proxyReqOpts;
  },
};

const identityServiceProxy = proxy(IDENTITY_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    proxyReqOpts.headers['x-auth-key'] = IDENTITY_SERVICE_AUTH_KEY;
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Identity service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
});

const electionServiceProxy = proxy(ELECTION_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    proxyReqOpts.headers['x-auth-key'] = ELECTION_SERVICE_AUTH_KEY;
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Election service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
});

const electionServiceMultipartProxy = proxy(ELECTION_SERVICE_URL, {
  ...proxyOptions,
  parseReqBody: false,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['x-auth-key'] = ELECTION_SERVICE_AUTH_KEY;
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Election service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
});

const voteServiceProxy = proxy(VOTE_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    proxyReqOpts.headers['x-auth-key'] = VOTE_SERVICE_AUTH_KEY;
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Vote service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
});

const resultServiceProxy = proxy(RESULTS_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    proxyReqOpts.headers['x-auth-key'] = RESULTS_SERVICE_AUTH_KEY;
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Results service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
});

const notificationServiceProxy = proxy(NOTIFICATION_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    proxyReqOpts.headers['x-auth-key'] = NOTIFICATION_SERVICE_AUTH_KEY;
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Notification service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
});

const faceIdServiceProxy = proxy(FACE_ID_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';
    proxyReqOpts.headers['x-auth-key'] = FACE_ID_SERVICE_AUTH_KEY;
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Face ID service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
});

const faceIdServiceMultipartProxy = proxy(FACE_ID_SERVICE_URL, {
  ...proxyOptions,
  parseReqBody: false,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['x-auth-key'] = FACE_ID_SERVICE_AUTH_KEY;
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from Face ID service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
});

module.exports = {
  voteServiceProxy,
  resultServiceProxy,
  faceIdServiceProxy,
  identityServiceProxy,
  electionServiceProxy,
  notificationServiceProxy,
  faceIdServiceMultipartProxy,
  electionServiceMultipartProxy,
};
