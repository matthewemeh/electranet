const router = require('express').Router();

const {
  verifyOtp,
  resetPassword,
  forgotPasswordInitiate,
} = require('../controllers/forgot-password.controllers');

router.post('/verify', verifyOtp);

router.post('/reset', resetPassword);

router.post('/initiate', forgotPasswordInitiate);

module.exports = router;
