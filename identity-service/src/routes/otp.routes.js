const router = require('express').Router();

const { sendOtp } = require('../controllers/otp.controllers');
const { validateAuthKey } = require('../middlewares/auth.middlewares');

router.use(validateAuthKey);

router.post('/send', sendOtp);

module.exports = router;
