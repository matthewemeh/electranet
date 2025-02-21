const jwt = require('jsonwebtoken');
const { ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');

const OTP = require('../models/otp.model');
const User = require('../models/user.model');
const Token = require('../models/token.model');
const { sendOTP } = require('../utils/otp.utils');
const storage = require('../configs/firebase.config');
const { checkIfFileExists } = require('../utils/firebase.utils');
const { sendNotification } = require('../utils/notification.utils');
const { createToken, sendResetToken } = require('../utils/token.utils');

/* Multipart key information */
const { USER_PAYLOAD_KEY, PROFILE_IMAGE_KEY } = require('../constants');

const registerUser = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const userPayload = JSON.parse(
      req.files.find(({ fieldname }) => fieldname === USER_PAYLOAD_KEY).buffer
    );

    // TODO: Integrate VIN verification using 3rd party API
    // If VIN verification is successful, then user registration can proceed
    // else, the process is terminated.

    // Check for duplicate VIN
    const userVinExists = await User.findOne({ vin: userPayload.vin });
    if (userVinExists) {
      httpStatusCode = 409;
      throw new Error(`This vin: ${userPayload.vin} is already registered on the platform`);
    }

    // Check for duplicate email
    const userEmailExists = await User.findOne({ email: userPayload.email });
    if (userEmailExists) {
      httpStatusCode = 409;
      throw new Error(`This email: ${userPayload.email} is already registered on the platform`);
    }

    // upload user profile image (if any) to firebase database
    const profileImage = req.files.find(({ fieldname }) => fieldname === PROFILE_IMAGE_KEY)?.buffer;
    const newUser = new User(userPayload);
    if (profileImage) {
      const imageRef = ref(storage, `users/${newUser._id}`);
      const snapshot = await uploadBytes(imageRef, profileImage);
      const url = await getDownloadURL(snapshot.ref);
      newUser.profileImageUrl = url;
    }
    const user = await newUser.save();

    // after successful user registration, add tokens to user object before sending to client
    const tokenData = { email: user.email, userID: user._id };
    const tokens = {
      accessToken: createToken(tokenData),
      refreshToken: createToken(tokenData, process.env.REFRESH_TOKEN_SECRET),
    };

    // give user new tokens
    await Token.create(tokens);
    user.tokens = tokens;

    // send OTP to user
    await sendOTP({ email: user.email, subject: 'ELECTRANET: Verify Email' });

    res.status(201).json({ message: 'Registration successful', status: 'success', data: user });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ errors: null, status: 'failed', httpStatusCode, message: error.message });
  }
};

/**
 * Under normal circumstances the user should not be able to update any information
 * because all the user information should have been fetched and set (immutable) from the
 * 3rd party API specified in the TODO comment in the registerUser controller.
 *
 * For now, the updateUser controller will be disabled (commented out) and can be re-enabled in the future
 * should a cogent need for its use arise.
 */
/* const updateUser = async (req, res) => {
  // only profile image can be updated
  try {
    // const userPayload = JSON.parse(
    //   req.files.find(({ fieldname }) => fieldname === USER_PAYLOAD_KEY).buffer
    // );

    const { userID } = req.user;
    const user = await User.findById(userID);
    if (password) user.password = password;

    // upload user's updated profile image (if any) to firebase database
    const profileImage = req.files.find(({ fieldname }) => fieldname === PROFILE_IMAGE_KEY)?.buffer;
    if (profileImage) {
      const imageRef = ref(storage, `users/${userID}`);
      const snapshot = await uploadBytes(imageRef, profileImage);
      const url = await getDownloadURL(snapshot.ref);
      user.profileImageUrl = url;
    }

    const updatedUser = await user.save();
    res
      .status(200)
      .json({ message: 'User details updated successfully', status: 'success', data: updatedUser });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errors: null, status: 'failed', httpStatusCode: 400, message: error.message });
  }
}; */

const resetPassword = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const { password, email } = req.body;

    // reset (update) user's password
    const user = await User.findOne({ email });
    user.password = password;
    await user.save();

    // delete OTP record
    await OTP.deleteOne({ email });

    await sendNotification({
      id: user._id,
      role: user.role,
      notifyEmail: true,
      subject: 'ELECTRANET: Password Reset Successful',
      message: `Your password has been reset successfully on ${new Date(
        user.updatedAt
      ).toString()}`,
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
    const user = await User.findOneAndUpdate({ email }, { emailVerified: true });

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

    const resetToken = await sendResetToken(email);
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

const deleteProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user.userID);

    // delete user image
    const filePath = `users/${user._id}`;
    const fileExists = await checkIfFileExists(filePath);
    if (fileExists) {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      user.profileImageUrl = '';
    }

    const updatedUser = await user.save();
    res.status(200).json({
      status: 'success',
      data: updatedUser,
      message: 'Profile image deleted successfully',
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: error.message, status: 'failed', errors: null, httpStatusCode: 400 });
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
  const httpStatusCode = 500;
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      httpStatusCode = 401;
      throw new Error('An authorization token is required');
    }

    // check if refreshToken exists in database
    const tokens = await Token.find({ refreshToken });
    if (!tokens) {
      httpStatusCode = 403;
      throw new Error('Session expired. Please login to start new session');
    }

    // generate new access token
    const { email, userID } = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const accessToken = createToken({ email, userID });
    tokens.accessToken = accessToken;
    await tokens.save();

    res
      .status(200)
      .json({ message: 'Session Refreshed', status: 'success', data: { accessToken } });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ message: error.message, status: 'failed', httpStatusCode, errors: null });
  }
};

module.exports = {
  login,
  // updateUser,
  registerUser,
  resetPassword,
  getRefreshToken,
  verifyRegisterOtp,
  deleteProfileImage,
  forgotPasswordInitiate,
  verifyForgotPasswordOtp,
};
