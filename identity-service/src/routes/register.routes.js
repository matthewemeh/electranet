const router = require('express').Router();

const { verifyOtp, registerUser, registerAdmin } = require('../controllers/register.controllers');

router.post('/verify', verifyOtp);

router.post('/user', registerUser);

router.post('/admin', registerAdmin);

module.exports = router;
