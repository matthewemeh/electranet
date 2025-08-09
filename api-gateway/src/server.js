require('dotenv').config();
const hpp = require('hpp');
const YAML = require('yamljs');
const helmet = require('helmet');
const express = require('express');
const { Redis } = require('ioredis');
const swaggerUI = require('swagger-ui-express');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('./utils/logger.utils');
const swaggerDocument = YAML.load('./src/swagger.yaml');
const { configureCors } = require('./config/cors.config');
const { configureRatelimit } = require('./config/ratelimit.config');
const { urlVersioning } = require('./middlewares/version.middlewares');
const { globalErrorHandler } = require('./middlewares/error.middlewares');
const { requestLogger } = require('./middlewares/request-logger.middlewares');
const { notFound, methodChecker } = require('./middlewares/endpoint.middlewares');
const {
  voteServiceProxy,
  faceIdServiceProxy,
  resultServiceProxy,
  electionServiceProxy,
  identityServiceProxy,
  notificationServiceProxy,
  faceIdServiceMultipartProxy,
  electionServiceMultipartProxy,
} = require('./config/proxy.config');

const app = express();

const {
  PORT,
  REDIS_URL,
  VOTE_SERVICE_URL,
  RESULTS_SERVICE_URL,
  FACE_ID_SERVICE_URL,
  ELECTION_SERVICE_URL,
  IDENTITY_SERVICE_URL,
  HEALTH_CHECK_RATE_LIMIT,
  NOTIFICATION_SERVICE_URL,
} = process.env;

// initialize Redis client
const redisClient = new Redis(REDIS_URL);

// apply middlewares
app.set('trust proxy', 1); // trust first proxy: Render
app.use(helmet());
app.use(hpp()); // HTTP Parameter Pollution protection
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

const healthCheckRateLimit = Number(HEALTH_CHECK_RATE_LIMIT) || 300;
const healthCheckRateLimiter = configureRatelimit(redisClient, healthCheckRateLimit);
app.get('/health', healthCheckRateLimiter, (req, res) => {
  logger.info('Health check successful');
  res.sendStatus(StatusCodes.OK);
});

app.use(configureCors);

// IP-based rate limiting for sensitive endpoints
const mainRatelimiter = configureRatelimit(redisClient, 200);
const otpRatelimiter = configureRatelimit(redisClient, 15, 300_000);
app.use('/v1/otp/send', otpRatelimiter);

app.get('/', (req, res) => {
  res.send('<h1>Electranet API</h1><a href="/api-docs">Documentation</a>');
});

// serve the OpenAPI specification
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// apply middleware to accept only specific version requests
app.use(urlVersioning('v1'));

// setting up proxy for identity services
app.use('/v1/otp', mainRatelimiter, identityServiceProxy);
app.use('/v1/auth', mainRatelimiter, identityServiceProxy);
app.use('/v1/users', mainRatelimiter, identityServiceProxy);

// setting up proxy for election services
app.use('/v1/parties/add', mainRatelimiter, electionServiceMultipartProxy);
app.use('/v1/parties/edit', mainRatelimiter, electionServiceMultipartProxy);
app.use('/v1/contestants/add', mainRatelimiter, electionServiceMultipartProxy);
app.use('/v1/contestants/edit', mainRatelimiter, electionServiceMultipartProxy);

app.use('/v1/parties', mainRatelimiter, electionServiceProxy);
app.use('/v1/elections', mainRatelimiter, electionServiceProxy);
app.use('/v1/contestants', mainRatelimiter, electionServiceProxy);

// setting up proxy for vote services
app.use('/v1/votes', mainRatelimiter, voteServiceProxy);

// setting up proxy for results services
app.use('/v1/results', mainRatelimiter, resultServiceProxy);

// setting up proxy for notification services
app.use('/v1/logs', mainRatelimiter, notificationServiceProxy);
app.use('/v1/notifications', mainRatelimiter, notificationServiceProxy);

// setting up proxy for Face ID services
app.use('/v1/face-id/register', mainRatelimiter, faceIdServiceMultipartProxy);

app.use('/v1/face-id', mainRatelimiter, faceIdServiceProxy);

// handle unallowed methods for each route
app.use(methodChecker);

// catch all route for undefined endpoints
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
