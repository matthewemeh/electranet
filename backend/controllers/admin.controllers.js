const { ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');

const OTP = require('../models/otp.model');
const User = require('../models/user.model');
const Admin = require('../models/admin.model');
const Token = require('../models/token.model');
const { sendOTP } = require('../utils/otp.utils');
const { hashData } = require('../utils/hash.utils');
const storage = require('../configs/firebase.config');
const ResetToken = require('../models/resetToken.model');
const { checkIfFileExists } = require('../utils/firebase.utils');
const { sendNotification } = require('../utils/notification.utils');
const { createToken, sendResetToken } = require('../utils/token.utils');

/* Multipart key information */
const { USER_PAYLOAD_KEY, PROFILE_IMAGE_KEY, ROLES } = require('../constants');

const registerAdmin = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const adminPayload = JSON.parse(
      req.files?.find(({ fieldname }) => fieldname === USER_PAYLOAD_KEY)?.buffer ?? '{}'
    );

    // Check for duplicate email
    const adminEmailExists = await Admin.findOne({ email: adminPayload.email });
    if (adminEmailExists) {
      httpStatusCode = 409;
      throw new Error(`This email: ${adminPayload.email} is already registered on the platform`);
    }

    // Check for duplicate email in user accounts
    const duplicateAccountExists = await User.findOne({ email: adminPayload.email });
    if (duplicateAccountExists) {
      httpStatusCode = 409;
      throw new Error(
        `This email: ${adminPayload.email} is already registered as an user on the platform`
      );
    }

    // check to ensure only 1 super-admin exists always
    const superAdminExists = await Admin.findOne({ role: ROLES.SUPER_ADMIN });
    if (superAdminExists && adminPayload.role === ROLES.SUPER_ADMIN) {
      throw new Error('A Super-Admin already exists on the platform');
    }

    // upload admin profile image (if any) to firebase database
    const profileImage = req.files?.find(
      ({ fieldname }) => fieldname === PROFILE_IMAGE_KEY
    )?.buffer;
    const newAdmin = new Admin(adminPayload);
    if (profileImage) {
      const imageRef = ref(storage, `admins/${newAdmin._id}`);
      const snapshot = await uploadBytes(imageRef, profileImage);
      const url = await getDownloadURL(snapshot.ref);
      newAdmin.profileImageUrl = url;
    }
    const admin = await newAdmin.save();

    // after successful admin registration, add tokens to admin object before sending to client
    const tokenData = { email: admin.email, adminID: admin._id };
    let tokens = {
      accessToken: createToken(tokenData),
      refreshToken: createToken(
        tokenData,
        process.env.REFRESH_TOKEN_SECRET,
        process.env.REFRESH_TOKEN_EXPIRY
      ),
    };

    // store unhashed tokens for admin
    const adminObject = admin.toJSON();
    adminObject.tokens = { ...tokens };

    // then hash the tokens
    tokens.accessToken = await hashData(tokens.accessToken);
    tokens.refreshToken = await hashData(tokens.refreshToken);

    // upload hashed tokens to database
    tokens.email = admin.email;
    await Token.create(tokens);

    // send OTP to admin
    await sendOTP({ email: admin.email, subject: 'ELECTRANET: Verify Email' });

    res
      .status(201)
      .json({ message: 'Registration successful', status: 'success', data: adminObject });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ errors: null, status: 'failed', httpStatusCode, message: error.message });
  }
};

const updateAdmin = async (req, res) => {
  // only profile image can be updated
  try {
    // const adminPayload = JSON.parse(
    //   req.files?.find(({ fieldname }) => fieldname === USER_PAYLOAD_KEY)?.buffer
    // );

    const { adminID } = req.admin;
    const admin = await Admin.findById(adminID);

    // upload admin's updated profile image (if any) to firebase database
    const profileImage = req.files?.find(
      ({ fieldname }) => fieldname === PROFILE_IMAGE_KEY
    )?.buffer;
    if (profileImage) {
      const imageRef = ref(storage, `admins/${adminID}`);
      const snapshot = await uploadBytes(imageRef, profileImage);
      const url = await getDownloadURL(snapshot.ref);
      admin.profileImageUrl = url;
    }

    const updatedAdmin = await admin.save();
    res.status(200).json({
      status: 'success',
      data: updatedAdmin,
      message: 'Admin details updated successfully',
    });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errors: null, status: 'failed', httpStatusCode: 400, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const { password, email } = req.body;

    // reset (update) admin's password
    const admin = await Admin.findOne({ email });
    admin.password = password;
    await admin.save();

    // delete resetToken record
    await ResetToken.deleteOne({ email });

    // delete any existing user tokens
    await Token.deleteOne({ email });

    await sendNotification({
      id: admin._id,
      role: admin.role,
      notifyEmail: true,
      subject: 'ELECTRANET: Password Reset Successful',
      message: `Your password has been reset successfully on ${new Date(
        admin.updatedAt
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

    // verify admin email
    const admin = await Admin.findOneAndUpdate({ email }, { emailVerified: true }, { new: true });

    // delete otp record
    await OTP.deleteOne({ email });
    res
      .status(200)
      .json({ message: 'Email verification successful', status: 'success', data: admin });
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

    // check if admin exists in database
    const admin = await Admin.findOne({ email });
    if (!admin) {
      httpStatusCode = 404;
      throw new Error('Admin does not exist on this platform');
    }

    // send OTP to admin
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

const deleteProfileImage = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const admin = await Admin.findById(req.admin.adminID);

    // delete admin image
    const filePath = `admins/${admin._id}`;
    const fileExists = await checkIfFileExists(filePath);
    if (fileExists) {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      admin.profileImageUrl = '';
    } else {
      httpStatusCode = 404;
      throw new Error('No profile image found');
    }

    const updatedAdmin = await admin.save();
    res.status(200).json({
      status: 'success',
      data: updatedAdmin,
      message: 'Profile image deleted successfully',
    });
  } catch (error) {
    res
      .status(httpStatusCode)
      .json({ message: error.message, status: 'failed', errors: null, httpStatusCode });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findByCredentials(email, password);
    res.status(200).json({ message: 'Login successful', status: 'success', data: admin });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errors: null, status: 'failed', httpStatusCode: 400, message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    let paginatedUsers = await User.paginate({}, { page, limit, sort: { createdAt: -1 } });

    res
      .status(200)
      .json({ message: 'Users fetched successfully', status: 'success', data: paginatedUsers });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: error.message, errors: null, httpStatusCode: 500, status: 'failed' });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    res
      .status(200)
      .json({ message: 'User information fetched successfully', status: 'success', data: user });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message, status: 'failed', httpStatusCode: 500, errors: null });
  }
};

const getRefreshToken = async (req, res) => {
  try {
    const { email, adminID } = req.admin;

    // create new accessToken
    const accessToken = createToken({ email, adminID });
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
    await Token.deleteOne({ email: req.admin.email });
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
  getUser,
  getUsers,
  updateAdmin,
  registerAdmin,
  resetPassword,
  getRefreshToken,
  verifyRegisterOtp,
  deleteProfileImage,
  forgotPasswordInitiate,
  verifyForgotPasswordOtp,
};
