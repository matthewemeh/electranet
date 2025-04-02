const OTP = require('../models/otp.model');
const ResetToken = require('../models/resetToken.model');
const { verifyHashedData } = require('../utils/hash.utils');
const { APIError, asyncHandler } = require('./error.middlewares');

const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  if (!otp) {
    throw new APIError("Provide 'otp' field", 400);
  }

  // check if OTP record exists in database
  const otpRecord = await OTP.findOne({ email });
  if (!otpRecord) {
    throw new APIError('No OTP available', 404);
  }

  // check if OTP has expired
  const otpExpired = Date.now() > otpRecord.expiresAt;
  if (otpExpired) {
    throw new APIError('OTP has expired', 403);
  }

  // check if OTP is correct
  const otpMatches = await verifyHashedData(otp, otpRecord.otp);
  if (!otpMatches) {
    throw new APIError('Wrong OTP provided!', 403);
  }

  return next();
};

const verifyResetToken = async (req, res, next) => {
  const { password, email, resetToken } = req.body;
  if (!password) {
    throw new APIError('Password is required!', 400);
  }
  if (!resetToken) {
    throw new APIError('Reset token is required!', 400);
  }

  const resetTokenRecord = await ResetToken.findOne({ email });
  if (!resetTokenRecord) {
    throw new APIError('No reset token available', 404);
  }

  const resetTokenExpired = Date.now() > resetTokenRecord.expiresAt;
  if (resetTokenExpired) {
    throw new APIError('Reset token has expired', 403);
  }

  const resetTokenMatches = await verifyHashedData(resetToken, resetTokenRecord.token);
  if (!resetTokenMatches) {
    throw new APIError('Wrong reset token provided!', 403);
  }

  return next();
};

module.exports = {
  verifyOtp: asyncHandler(verifyOtp),
  verifyResetToken: asyncHandler(verifyResetToken),
};
