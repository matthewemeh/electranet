const router = require('express').Router();

const { addParty, updateParty, getParties } = require('../controllers/party.controllers');
const {
  verifyToken,
  validateAuthKey,
  verifyAdminToken,
} = require('../middlewares/auth.middlewares');

router.use(validateAuthKey);

router.use(verifyToken);

router.use(verifyAdminToken);

router.post('/', addParty);

router.get('/', getParties);

router.patch('/:id', updateParty);

module.exports = router;
