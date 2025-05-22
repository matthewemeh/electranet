require('dotenv').config();
const helmet = require('helmet');
const express = require('express');
const { Redis } = require('ioredis');
const { connect } = require('mongoose');

const { logger } = require('./utils/logger.utils');
const faceIdRoutes = require('./routes/face-id.routes');
const { configureCors } = require('./config/cors.config');
const { useRedis } = require('./middlewares/redis.middlewares');
const { configureRatelimit } = require('./config/ratelimit.config');
const { globalErrorHandler } = require('./middlewares/error.middlewares');
const { useEndpointCheck } = require('./middlewares/endpoint.middlewares');
const { requestLogger } = require('./middlewares/request-logger.middlewares');
const { configureRatelimitRedis } = require('./config/ratelimit-redis.config');

const app = express();

const { PORT, MONGO_URI, REDIS_URL } = process.env;

// connect to MongoDB
connect(MONGO_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(error => logger.error('MongoDB connection error', error));

// initialize Redis client
const redisClient = new Redis(REDIS_URL);

// apply middlewares
app.use(helmet());
app.use(configureCors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// DDoS protection and rate limiting
app.use(configureRatelimitRedis(redisClient));

// apply this sensitiveEndpointsLimiter to our routes
app.use(configureRatelimit(redisClient));

// Routes
app.get('/health', (req, res) => {
  logger.info('Health check successful');
  res.sendStatus(200);
});
app.use('/api/face-id', useRedis(redisClient), faceIdRoutes);

// check for calls on routes with wrong method
app.use(useEndpointCheck(app));

// error handler
app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info(`Face ID service is running on port: ${PORT}`);
});

// unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at', promise, 'reason:', reason);
});
