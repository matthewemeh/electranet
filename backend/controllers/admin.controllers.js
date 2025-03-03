const moment = require('moment');
const { ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');

const Log = require('../models/log.model');
const OTP = require('../models/otp.model');
const User = require('../models/user.model');
const Admin = require('../models/admin.model');
const Token = require('../models/token.model');
const { sendOTP } = require('../utils/otp.utils');
const { hashData } = require('../utils/hash.utils');
const { sendEmail } = require('../utils/email.utils');
const storage = require('../configs/firebase.config');
const ResetToken = require('../models/resetToken.model');
const AdminToken = require('../models/adminToken.model');
const { checkIfFileExists } = require('../utils/firebase.utils');
const { sendNotification } = require('../utils/notification.utils');
const { createToken, sendResetToken } = require('../utils/token.utils');

/* Multipart key information */
const { PAYLOAD_KEY, MEDIA_IMAGE_KEY, ROLES } = require('../constants');

const registerAdmin = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const adminPayload = JSON.parse(
      req.files?.find(({ fieldname }) => fieldname === PAYLOAD_KEY)?.buffer ?? '{}'
    );

    // Check for duplicate email in user accounts
    const duplicateAccountExists = await User.findOne({ email: adminPayload.email });
    if (duplicateAccountExists) {
      httpStatusCode = 409;
      throw new Error(
        `This email: ${adminPayload.email} is already registered as a user on the platform`
      );
    }

    // check to ensure only 1 super-admin exists always
    const superAdminExists = await Admin.findOne({ role: ROLES.SUPER_ADMIN });
    if (superAdminExists && adminPayload.role === ROLES.SUPER_ADMIN) {
      throw new Error('A Super-Admin already exists on the platform');
    }

    const admin = new Admin(adminPayload);

    // upload admin profile image (if any) to firebase database
    const profileImage = req.files?.find(({ fieldname }) => fieldname === MEDIA_IMAGE_KEY)?.buffer;
    if (profileImage) {
      const imageRef = ref(storage, `electranet/admins/${admin._id}`);
      const snapshot = await uploadBytes(imageRef, profileImage);
      const url = await getDownloadURL(snapshot.ref);
      admin.profileImageUrl = url;
    }
    await admin.save();

    // after successful admin registration, add tokens to admin object before sending to client
    const tokenData = { issuedAt: Date.now(), email: admin.email, _id: admin._id };
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

const updateProfileImage = async (req, res) => {
  try {
    const { admin } = req;

    // upload admin's updated profile image (if any) to firebase database
    const profileImage = req.files?.find(({ fieldname }) => fieldname === MEDIA_IMAGE_KEY)?.buffer;
    if (profileImage) {
      const imageRef = ref(storage, `electranet/admins/${admin._id}`);
      const snapshot = await uploadBytes(imageRef, profileImage);
      const url = await getDownloadURL(snapshot.ref);
      await Admin.updateOne({ email: admin.email }, { profileImageUrl: url });
      admin.profileImageUrl = url;
    }

    res
      .status(200)
      .json({ data: admin, status: 'success', message: 'Admin details updated successfully' });
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
      message: `Your password has been reset successfully on ${moment(admin.updatedAt).format(
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
    const { admin } = req;

    // delete admin image
    const filePath = `electranet/admins/${admin._id}`;
    const fileExists = await checkIfFileExists(filePath);
    if (fileExists) {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      await Admin.updateOne({ email: admin.email }, { profileImageUrl: '' });
      admin.profileImageUrl = '';
    } else {
      httpStatusCode = 404;
      throw new Error('No profile image found');
    }

    res
      .status(200)
      .json({ data: admin, status: 'success', message: 'Profile image deleted successfully' });
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
    const { email, _id } = req.admin;

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
    await Token.deleteOne({ email: req.admin.email });
    res.status(200).json({ message: 'Logout successful', status: 'success', data: null });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: error.message, status: 'failed', httpStatusCode: 500, errors: null });
  }
};

const inviteAdmins = (req, res) => {
  let httpStatusCode = 500;
  try {
    const MAX_INVITEES_PER_CALL = 10;
    const { invitees } = req.body;
    if (!invitees || invitees.length === 0) {
      httpStatusCode = 400;
      throw new Error("Provide 'invitees' array field");
    } else if (invitees.length > MAX_INVITEES_PER_CALL) {
      httpStatusCode = 400;
      throw new Error(`You can invite a maximum of ${MAX_INVITEES_PER_CALL} admins at a time`);
    }

    const invitedResults = { success: [], failure: [] };
    invitees.forEach(async ({ email, expiresAt, createdAt }) => {
      try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
          throw new Error('Email has not been registered as an admin on the plaform');
        } else if (email === req.admin.email) {
          throw new Error(
            'Redundant invite: this email is owned by a Super-Admin who has highest authority'
          );
        } else if (!admin.emailVerified) {
          throw new Error('This email is not verified yet');
        }

        await AdminToken.create({
          email,
          createdAt,
          expiresAt,
          status: { statusStart: Date.now() },
        });

        await sendEmail({
          email,
          subject: 'ELECTRANET: Admin Invite',
          html: `<p>Hello from Electranet! You have been invited as an Admin on ELECTRANET. You will aid users who come to the polling unit with their voting process</p>
        <p>Your Admin access will expire on ${moment(expiresAt).format('LLL')}</p>`,
        });

        await Log.create({
          action: 'INVITE',
          admin: req.admin._id,
          message: `Invited Admin with email: ${email}`,
        });

        invitedResults.success.push({ email, reason: 'All checks passed' });
      } catch (error) {
        console.log(error);
        invitedResults.failure.push({ email, reason: error.message });
      }
    });
    res.status(200).json({ message: 'Invitations sent', status: 'success', data: invitedResults });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ message: error.message, status: 'failed', httpStatusCode, errors: null });
  }
};

module.exports = {
  login,
  logout,
  getUser,
  getUsers,
  inviteAdmins,
  registerAdmin,
  resetPassword,
  getRefreshToken,
  verifyRegisterOtp,
  deleteProfileImage,
  updateProfileImage,
  forgotPasswordInitiate,
  verifyForgotPasswordOtp,
};
