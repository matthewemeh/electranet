const jwt = require('jsonwebtoken');

const User = require('../models/user.model');

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
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }

  return next();
};

module.exports = { verifyToken };
