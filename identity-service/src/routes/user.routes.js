const router = require('express').Router();

const {
  verifyToken,
  validateApiKey,
  verifyAdminToken,
  verifySuperAdmin,
} = require('../middlewares/auth.middlewares');
const { getUsers, inviteAdmin } = require('../controllers/user.controllers');

router.use(validateApiKey);

router.use(verifyToken);

router.get('/', verifyAdminToken, getUsers);

router.post('/invite', verifySuperAdmin, inviteAdmin);

module.exports = router;
