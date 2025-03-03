const multer = require('multer');
const router = require('express').Router();

const { verifyOtp, verifyResetToken } = require('../middlewares/index.middlewares');
const {
  verifyToken,
  verifyAdminToken,
  verifySuperAdmin,
  verifyRefreshToken,
} = require('../middlewares/admin.middlewares');

const {
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
} = require('../controllers/admin.controllers');

const upload = multer();

router.route('/auth/login').post(login);

router.route('/auth/logout').post(verifyToken, logout);

router.route('/register').post(upload.any(), registerAdmin);

router.route('/register/verify-otp').patch(verifyOtp, verifyRegisterOtp);

router.route('/auth/forgot-password/initiate').post(forgotPasswordInitiate);

router.route('/auth/forgot-password/verify-otp').post(verifyOtp, verifyForgotPasswordOtp);

router.route('/auth/forgot-password/reset').patch(verifyResetToken, resetPassword);

router.route('/delete-profile-image').patch(verifyToken, deleteProfileImage);

router.route('/refresh-token').post(verifyRefreshToken, getRefreshToken);

router.route('/update-profile-image').patch(verifyToken, upload.any(), updateProfileImage);

router.route('/get-users').get(verifyToken, verifyAdminToken, getUsers);

router.route('/get-users/:id').get(verifyToken, verifyAdminToken, getUser);

router.route('/invite-admins').post(verifyToken, verifySuperAdmin, inviteAdmins);

module.exports = router;
