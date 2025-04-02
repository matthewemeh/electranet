const jwt = require('jsonwebtoken');

const User = require('../models/user.model');
const Token = require('../models/token.model');
const { verifyHashedData } = require('../utils/hash.utils');
const { APIError, asyncHandler } = require('./error.middlewares');

const { ACCESS_TOKEN_SECRET } = process.env;

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    throw new APIError('An authorization token is required', 401);
  }

  let decodedUser;
  try {
    decodedUser = jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new APIError('Session expired', 403);
  }

  // check if token exists in database
  const tokenRecord = await Token.findOne({ email: decodedUser.email });
  if (!tokenRecord) {
    throw new APIError('No token available', 404);
  }

  // check if token is valid
  const tokenMatches = await verifyHashedData(token, tokenRecord.accessToken);
  if (!tokenMatches) {
    throw new APIError('Invalid token provided', 400);
  }

  // check if user exists in database
  const user = await User.findById(decodedUser._id);
  if (!user) {
    throw new APIError('User does not exist on this platform', 500);
  }

  req.user = user;

  return next();
};

const verifyRefreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new APIError('An refresh token is required', 401);
  }

  // verify refresh token
  const decodedUser = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

  // check if refreshToken exists in database
  const tokenRecord = await Token.findOne({ email: decodedUser.email });
  if (!tokenRecord) {
    throw new APIError('No refresh token available', 404);
  }

  // check if token is valid
  const tokenMatches = await verifyHashedData(refreshToken, tokenRecord.refreshToken);
  if (!tokenMatches) {
    throw new APIError('Invalid token provided', 400);
  }

  // check if user exists in database
  const user = await User.findById(decodedUser._id);
  if (!user) {
    throw new APIError('User does not exist on this platform', 500);
  }

  req.user = user;
  return next();
};

module.exports = {
  verifyToken: asyncHandler(verifyToken),
  verifyRefreshToken: asyncHandler(verifyRefreshToken),
};
