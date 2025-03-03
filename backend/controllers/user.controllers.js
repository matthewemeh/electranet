const moment = require('moment');
const { ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');

const OTP = require('../models/otp.model');
const User = require('../models/user.model');
const Token = require('../models/token.model');
const Admin = require('../models/admin.model');
const { sendOTP } = require('../utils/otp.utils');
const { hashData } = require('../utils/hash.utils');
const storage = require('../configs/firebase.config');
const ResetToken = require('../models/resetToken.model');
const { checkIfFileExists } = require('../utils/firebase.utils');
const { sendNotification } = require('../utils/notification.utils');
const { createToken, sendResetToken } = require('../utils/token.utils');

/* Multipart key information */
const { PAYLOAD_KEY, MEDIA_IMAGE_KEY } = require('../constants');

const registerUser = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const userPayload = JSON.parse(
      req.files?.find(({ fieldname }) => fieldname === PAYLOAD_KEY)?.buffer ?? '{}'
    );

    // TODO: Integrate VIN verification using 3rd party API
    // If VIN verification is successful, then user registration can proceed
    // else, the process is terminated.

    // Check for duplicate email in admin accounts
    const duplicateAccountExists = await Admin.findOne({ email: userPayload.email });
    if (duplicateAccountExists) {
      httpStatusCode = 409;
      throw new Error(
        `This email: ${userPayload.email} is already registered as an admin on the platform`
      );
    }

    const user = new User(userPayload);

    // upload user profile image (if any) to firebase database
    const profileImage = req.files?.find(({ fieldname }) => fieldname === MEDIA_IMAGE_KEY)?.buffer;
    if (profileImage) {
      const imageRef = ref(storage, `electranet/users/${user._id}`);
      const snapshot = await uploadBytes(imageRef, profileImage);
      const url = await getDownloadURL(snapshot.ref);
      user.profileImageUrl = url;
    }
    await user.save();

    // after successful user registration, add tokens to user object before sending to client
    const tokenData = { issuedAt: Date.now(), email: user.email, _id: user._id };
    let tokens = {
      accessToken: createToken(tokenData),
      refreshToken: createToken(
        tokenData,
        process.env.REFRESH_TOKEN_SECRET,
        process.env.REFRESH_TOKEN_EXPIRY
      ),
    };

    // store unhashed tokens for user
    const userObject = user.toJSON();
    userObject.tokens = { ...tokens };

    // then hash the tokens
    tokens.accessToken = await hashData(tokens.accessToken);
    tokens.refreshToken = await hashData(tokens.refreshToken);

    // upload hashed tokens to database
    tokens.email = user.email;
    await Token.create(tokens);

    // send OTP to user
    await sendOTP({ email: user.email, subject: 'ELECTRANET: Verify Email' });

    res
      .status(201)
      .json({ message: 'Registration successful', status: 'success', data: userObject });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ errors: null, status: 'failed', httpStatusCode, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const { password, email } = req.body;

    // reset (update) user's password
    const user = await User.findOne({ email });
    user.password = password;
    await user.save();

    // delete resetToken record
    await ResetToken.deleteOne({ email });

    // delete any existing user tokens
    await Token.deleteOne({ email });

    await sendNotification({
      id: user._id,
      role: user.role,
      notifyEmail: true,
      subject: 'ELECTRANET: Password Reset Successful',
      message: `Your password has been reset successfully on ${moment(user.updatedAt).format(
        'LLL'
      )}`,
    });
    res.status(200).json({ message: 'Password reset successfully', status: 'success', data: null });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ message: error.message, status: 'failed', errors: null, httpStatusCode });
  }
};

const verifyRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // verify user email
    const user = await User.findOneAndUpdate({ email }, { emailVerified: true }, { new: true });

    // delete otp record
    await OTP.deleteOne({ email });
    res
      .status(200)
      .json({ message: 'Email verification successful', status: 'success', data: user });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errors: null, status: 'failed', httpStatusCode: 400, message: error.message });
  }
};

const forgotPasswordInitiate = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const { email } = req.body;

    // check if user exists in database
    const user = await User.findOne({ email });
    if (!user) {
      httpStatusCode = 404;
      throw new Error('User does not exist on this platform');
    }

    // send OTP to user
    await sendOTP({ email, subject: 'ELECTRANET: Forgot Password' });
    res.status(200).json({
      data: null,
      status: 'success',
      message: 'Password reset initiated successfully; proceed to validate OTP',
    });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ errors: null, status: 'failed', httpStatusCode, message: error.message });
  }
};

const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // generate reset token
    const resetToken = await sendResetToken(email);

    // then delete the otp record
    await OTP.deleteOne({ email });
    res.status(200).json({
      status: 'success',
      data: { email, resetToken },
      message: 'OTP verification successful',
    });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errors: null, status: 'failed', httpStatusCode: 400, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    res.status(200).json({ message: 'Login successful', status: 'success', data: user });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errors: null, status: 'failed', httpStatusCode: 400, message: error.message });
  }
};

const getRefreshToken = async (req, res) => {
  try {
    const { email, _id } = req.user;

    // create new accessToken
    const accessToken = createToken({ issuedAt: Date.now(), email, _id });
    const tokenRecord = await Token.findOne({ email });
    tokenRecord.accessToken = await hashData(accessToken);
    await tokenRecord.save();

    res
      .status(200)
      .json({ message: 'Session Refreshed', status: 'success', data: { accessToken } });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: error.message, status: 'failed', httpStatusCode: 500, errors: null });
  }
};

const logout = async (req, res) => {
  try {
    await Token.deleteOne({ email: req.user.email });
    res.status(200).json({ message: 'Logout successful', status: 'success', data: null });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: error.message, status: 'failed', httpStatusCode: 500, errors: null });
  }
};

module.exports = {
  login,
  logout,
  registerUser,
  resetPassword,
  getRefreshToken,
  verifyRegisterOtp,
  forgotPasswordInitiate,
  verifyForgotPasswordOtp,
};
