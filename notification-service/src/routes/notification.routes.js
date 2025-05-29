const router = require('express').Router();

const { getNotifications } = require('../controllers/notification.controllers');
const { validateAuthKey, verifyToken } = require('../middlewares/auth.middlewares');

router.use(validateAuthKey);

router.use(verifyToken);

router.get('/', getNotifications);

module.exports = router;
