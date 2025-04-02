const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const { hashData } = require('./hash.utils');
const ResetToken = require('../models/resetToken.model');

const { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY } = process.env;

/**
 *
 * @param {any} tokenData data to be signed with jwt
 * @param {string?} tokenKey key to use for signing the data
 * @param {string?} expiresIn specifies when generated token expires e.g 10s, 15s, 5m, 2d, etc
 * @returns {string} generated signed token
 */
const createToken = (
  tokenData,
  tokenKey = ACCESS_TOKEN_SECRET,
  expiresIn = ACCESS_TOKEN_EXPIRY
) => {
  return jwt.sign(tokenData, tokenKey, { expiresIn });
};

/**
 *
 * @param {string} email to create reset token for user
 * @param {number?} duration reset token's validity period in minutes
 * @returns {string} reset token string for user
 */
const sendResetToken = async (email, duration = 10) => {
  // clear any old record
  await ResetToken.deleteOne({ email });

  // save reset token record
  const generatedResetToken = uuidv4();
  const hashedResetToken = await hashData(generatedResetToken);
  await ResetToken.create({
    email,
    createdAt: Date.now(),
    token: hashedResetToken,
    expiresAt: Date.now() + 60_000 * +duration,
  });
  return generatedResetToken;
};

module.exports = { createToken, sendResetToken };
