const router = require('express').Router();

const { getLogs } = require('../controllers/log.controllers');
const {
  verifyToken,
  validateAuthKey,
  verifyAdminToken,
} = require('../middlewares/auth.middlewares');

router.use(validateAuthKey);

router.use(verifyToken);

router.use(verifyAdminToken);

router.get('/', getLogs);

module.exports = router;
