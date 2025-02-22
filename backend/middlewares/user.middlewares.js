const jwt = require('jsonwebtoken');

const User = require('../models/user.model');
const Token = require('../models/token.model');
const { verifyHashedData } = require('../utils/hash.utils');

const { ACCESS_TOKEN_SECRET } = process.env;

const verifyToken = async (req, res, next) => {
  let httpStatusCode = 403;
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      httpStatusCode = 401;
      throw new Error('An authorization token is required');
    }

    const decodedUser = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = decodedUser;

    // check if token exists in database
    const tokenRecord = await Token.findOne({ email: req.user.email });
    if (!tokenRecord) {
      httpStatusCode = 404;
      throw new Error('No token available');
    }

    // check if token is valid
    const tokenMatches = await verifyHashedData(token, tokenRecord.accessToken);
    if (!tokenMatches) {
      httpStatusCode = 400;
      throw new Error('Invalid token provided');
    }

    // check if user exists in database
    const user = await User.findById(req.user.userID);
    if (!user) {
      httpStatusCode = 500;
      throw new Error('User does not exist on this platform');
    }
  } catch (error) {
    if (httpStatusCode === 403) {
      error.message = 'Session expired.';
    }
    console.log(error);
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }

  return next();
};

const verifyRefreshToken = async (req, res, next) => {
  let httpStatusCode = 403;
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      httpStatusCode = 401;
      throw new Error('An refresh token is required');
    }

    // verify refresh token
    const decodedUser = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    req.user = decodedUser;

    // check if refreshToken exists in database
    const tokenRecord = await Token.findOne({ email: req.user.email });
    if (!tokenRecord) {
      httpStatusCode = 404;
      throw new Error('No refresh token available');
    }

    // check if token is valid
    const tokenMatches = await verifyHashedData(refreshToken, tokenRecord.refreshToken);
    if (!tokenMatches) {
      httpStatusCode = 400;
      throw new Error('Invalid token provided');
    }

    // check if user exists in database
    const user = await User.findById(req.user.userID);
    if (!user) {
      httpStatusCode = 500;
      throw new Error('User does not exist on this platform');
    }
  } catch (error) {
    if (httpStatusCode === 403) {
      error.message = 'Session expired. Please login to start new session';
    }
    console.log(error);
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }
  return next();
};

module.exports = { verifyToken, verifyRefreshToken };
