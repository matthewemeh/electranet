const router = require('express').Router();

const registerRoutes = require('./register.routes');
const forgotPasswordRoutes = require('./forgot-password.routes');
const { validateAuthKey } = require('../middlewares/auth.middlewares');
const { login, logout, getRefreshToken } = require('../controllers/identity.controllers');

router.use(validateAuthKey);

router.use('/register', registerRoutes);

router.use('/forgot-password', forgotPasswordRoutes);

router.post('/login', login);

router.post('/logout', logout);

router.post('/refresh-token', getRefreshToken);

module.exports = router;
