const router = require('express').Router();

const {
  verifyToken,
  validateAuthKey,
  verifyAdminToken,
  verifySuperAdmin,
} = require('../middlewares/auth.middlewares');
const {
  getUsers,
  inviteAdmin,
  revokeRights,
  getAdminTokens,
} = require('../controllers/user.controllers');

router.use(validateAuthKey);

router.use(verifyToken);

router.use(verifyAdminToken);

router.get('/', getUsers);

router.use(verifySuperAdmin);

router.post('/invite', inviteAdmin);

router.get('/tokens', getAdminTokens);

router.patch('/revoke/:id', revokeRights);

module.exports = router;
