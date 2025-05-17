const router = require('express').Router();

const { sendOtp } = require('../controllers/otp.controllers');
const { validateApiKey } = require('../middlewares/auth.middlewares');

router.use(validateApiKey);

router.post('/send', sendOtp);

module.exports = router;
