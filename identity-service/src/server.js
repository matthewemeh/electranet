require('dotenv').config();
const helmet = require('helmet');
const express = require('express');
const { Redis } = require('ioredis');
const { connect } = require('mongoose');

const otpRoutes = require('./routes/otp.routes');
const { logger } = require('./utils/logger.utils');
const userRoutes = require('./routes/user.routes');
const { configureCors } = require('./config/cors.config');
const identityRoutes = require('./routes/identity.routes');
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

// IP-based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = configureRatelimit(redisClient);

// apply this sensitiveEndpointsLimiter to our routes
app.use('/api/auth/register', sensitiveEndpointsLimiter);
app.use('/api/otp/send', configureRatelimit(redisClient, 15, 300_000));

// Routes
app.get('/health', (req, res) => {
  logger.info('Health check successful');
  res.sendStatus(200);
});
app.use('/api/otp', useRedis(redisClient), otpRoutes);
app.use('/api/users', useRedis(redisClient), userRoutes);
app.use('/api/auth', useRedis(redisClient), identityRoutes);

// check for calls on routes with wrong method
app.use(useEndpointCheck(app));

// error handler
app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service is running on port: ${PORT}`);
});

// unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at', promise, 'reason:', reason);
});
