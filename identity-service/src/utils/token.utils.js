const { sign } = require('jsonwebtoken');
const { randomBytes } = require('crypto');

const RefreshToken = require('../models/refresh-token.model');

/**
 * generates token and refresh token, then stores refresh token in database
 * @param {{ _id: string, email: { value: string }}} user
 */
const generateTokens = async user => {
  const accessToken = sign({ _id: user._id, email: user.email.value }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // refresh token expires in 7 days

  await RefreshToken.create({ token: refreshToken, user: user._id, expiresAt });

  return { accessToken, refreshToken };
};

module.exports = { generateTokens };
