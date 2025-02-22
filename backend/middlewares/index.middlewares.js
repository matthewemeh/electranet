const OTP = require('../models/otp.model');
const ResetToken = require('../models/resetToken.model');
const { verifyHashedData } = require('../utils/hash.utils');

const verifyOtp = async (req, res, next) => {
  let httpStatusCode = 500;
  try {
    const { email, otp } = req.body;

    if (!otp) {
      httpStatusCode = 400;
      throw new Error("Provide 'otp' field");
    }

    // check if OTP record exists in database
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      httpStatusCode = 404;
      throw new Error('No OTP available');
    }

    // check if OTP has expired
    const otpExpired = Date.now() > otpRecord.expiresAt;
    if (otpExpired) {
      httpStatusCode = 403;
      throw new Error('OTP has expired');
    }

    // check if OTP is correct
    const otpMatches = await verifyHashedData(otp, otpRecord.otp);
    if (!otpMatches) {
      httpStatusCode = 403;
      throw new Error('Wrong OTP provided!');
    }
  } catch (error) {
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }

  return next();
};

const verifyResetToken = async (req, res, next) => {
  let httpStatusCode = 400;
  try {
    const { password, email, resetToken } = req.body;
    if (!password) {
      throw new Error('Password is required!');
    }
    if (!resetToken) {
      throw new Error('Reset token is required!');
    }

    const resetTokenRecord = await ResetToken.findOne({ email });
    if (!resetTokenRecord) {
      httpStatusCode = 404;
      throw new Error('No reset token available');
    }

    const resetTokenExpired = Date.now() > resetTokenRecord.expiresAt;
    if (resetTokenExpired) {
      httpStatusCode = 403;
      throw new Error('Reset token has expired');
    }

    const resetTokenMatches = await verifyHashedData(resetToken, resetTokenRecord.token);
    if (!resetTokenMatches) {
      httpStatusCode = 403;
      throw new Error('Wrong reset token provided!');
    }
  } catch (error) {
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }

  return next();
};

module.exports = { verifyOtp, verifyResetToken };
