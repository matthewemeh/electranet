const multer = require('multer');
const router = require('express').Router();

const { logout } = require('../controllers/index.controllers');
const { verifyToken } = require('../middlewares/user.middlewares');
const { verifyOtp, verifyResetToken } = require('../middlewares/index.middlewares');

const {
  login,
  // updateUser,
  registerUser,
  resetPassword,
  getRefreshToken,
  verifyRegisterOtp,
  deleteProfileImage,
  forgotPasswordInitiate,
  verifyForgotPasswordOtp,
} = require('../controllers/user.controllers');

const upload = multer();

router.route('/auth/login').post(login);

router.route('/auth/logout').post(verifyToken, logout);

router.route('/register').post(upload.any(), registerUser);

router.route('/register/verify-otp').patch(verifyOtp, verifyRegisterOtp);

router.route('/auth/forgot-password/initiate').post(forgotPasswordInitiate);

router.route('/auth/forgot-password/verify-otp').post(verifyOtp, verifyForgotPasswordOtp);

router.route('/auth/forgot-password/reset').patch(verifyResetToken, resetPassword);

router.route('/delete-profile-image').patch(verifyToken, deleteProfileImage);

router.route('/refresh-token').get(getRefreshToken);

// Please refer to block comment above the (commented) updateUser controller in user.controllers.js
// router.route('/update-user').patch(upload.any(), verifyToken, updateUser);

module.exports = router;
