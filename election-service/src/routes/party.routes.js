const multer = require('multer');
const router = require('express').Router();

const { addParty, updateParty, getParties } = require('../controllers/party.controllers');
const {
  verifyToken,
  validateAuthKey,
  verifyAdminToken,
} = require('../middlewares/auth.middlewares');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(validateAuthKey);

router.use(verifyToken);

router.use(verifyAdminToken);

router.get('/', getParties);

router.post('/add', upload.any(), addParty);

router.patch('/edit/:id', upload.any(), updateParty);

module.exports = router;
