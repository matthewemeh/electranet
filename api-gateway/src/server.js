require('dotenv').config();
const hpp = require('hpp');
const yaml = require('yamljs');
const helmet = require('helmet');
const express = require('express');
const { Redis } = require('ioredis');
const proxy = require('express-http-proxy');
const swaggerUI = require('swagger-ui-express');
const { StatusCodes } = require('http-status-codes');

// const swaggerDocument = require('./swagger.yaml');
const { logger } = require('./utils/logger.utils');
const { configureCors } = require('./config/cors.config');
const { configureRatelimit } = require('./config/ratelimit.config');
const { validateApiKey } = require('./middlewares/auth.middlewares');
const { urlVersioning } = require('./middlewares/version.middlewares');
const { globalErrorHandler } = require('./middlewares/error.middlewares');
const { requestLogger } = require('./middlewares/request-logger.middlewares');
const { notFound, methodNotAllowed } = require('./middlewares/endpoint.middlewares');

const app = express();

const {
  PORT,
  REDIS_URL,
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

// initialize Redis client
const redisClient = new Redis(REDIS_URL);

// apply middlewares
app.set('trust proxy', 1); // trust first proxy: Render
app.use(helmet());
app.use(hpp()); // HTTP Parameter Pollution protection
app.use(configureCors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// IP-based rate limiting for sensitive endpoints
app.use(configureRatelimit(redisClient));

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

app.get('/health', (req, res) => {
  logger.info('Health check successful');
  res.sendStatus(StatusCodes.OK);
});

// serve the OpenAPI specification
// app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// apply middleware to accept only specific version requests
app.use(urlVersioning('v1'));

// setting up proxy for identity services
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
app.use('/v1/otp', validateApiKey, identityServiceProxy);
app.use('/v1/auth', validateApiKey, identityServiceProxy);
app.use('/v1/users', validateApiKey, identityServiceProxy);

// setting up proxy for election services
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
app.use('/v1/parties', validateApiKey, electionServiceProxy);
app.use('/v1/elections', validateApiKey, electionServiceProxy);
app.use('/v1/contestants', validateApiKey, electionServiceProxy);

// setting up proxy for vote services
app.use(
  '/v1/votes',
  validateApiKey,
  proxy(VOTE_SERVICE_URL, {
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
  })
);

// setting up proxy for results services
app.use(
  '/v1/results',
  validateApiKey,
  proxy(RESULTS_SERVICE_URL, {
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
  })
);

// setting up proxy for notification services
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
app.use('/v1/logs', validateApiKey, notificationServiceProxy);
app.use('/v1/notifications', validateApiKey, notificationServiceProxy);

// setting up proxy for Face ID services
app.use(
  '/v1/face-id/register',
  validateApiKey,
  proxy(FACE_ID_SERVICE_URL, {
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
  })
);

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
app.use('/v1/face-id', validateApiKey, faceIdServiceProxy);

// handle method not allowed for each route
app.use(methodNotAllowed);

// catch-all route for undefined endpoints
app.use(notFound);

// error handler
app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway is running on port: ${PORT}`);
  logger.info(`Identity service is running on: ${IDENTITY_SERVICE_URL}`);
  logger.info(`Election service is running on: ${ELECTION_SERVICE_URL}`);
  logger.info(`Voting service is running on: ${VOTE_SERVICE_URL}`);
  logger.info(`Results service is running on: ${RESULTS_SERVICE_URL}`);
  logger.info(`Face ID service is running on: ${FACE_ID_SERVICE_URL}`);
  logger.info(`Notification service is running on: ${NOTIFICATION_SERVICE_URL}`);
  logger.info(`Redis URL: ${REDIS_URL}`);
});
