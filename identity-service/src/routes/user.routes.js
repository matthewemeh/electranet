const router = require('express').Router();

const { isValidID } = require('../middlewares/mongoose.middlewares');
const {
  verifyToken,
  validateAuthKey,
  verifyAdminToken,
  verifySuperAdmin,
} = require('../middlewares/auth.middlewares');
const {
  getUsers,
  inviteAdmin,
  getAdminTokens,
  modifyAdminToken,
} = require('../controllers/user.controllers');

router.use(validateAuthKey, verifyToken);

router.use(verifyAdminToken);

router.get('/', getUsers);

router.use(verifySuperAdmin);

router.post('/invite', inviteAdmin);

router.get('/tokens', getAdminTokens);

router.patch('/tokens/:id', isValidID, modifyAdminToken);

module.exports = router;
