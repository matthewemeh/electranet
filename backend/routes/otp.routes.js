const router = require('express').Router();

const { resendOTP } = require('../controllers/otp.controllers');

router.post('/resend-otp', resendOTP);

module.exports = router;
