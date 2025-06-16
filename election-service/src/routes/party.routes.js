const multer = require('multer');
const router = require('express').Router();

const { isValidID } = require('../middlewares/mongoose.middlewares');
const { addParty, updateParty, getParties } = require('../controllers/party.controllers');
const {
  verifyToken,
  validateAuthKey,
  verifyAdminToken,
} = require('../middlewares/auth.middlewares');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(validateAuthKey, verifyToken, verifyAdminToken);

router.get('/', getParties);

router.post('/add', upload.any(), addParty);

router.patch('/edit/:id', isValidID, upload.any(), updateParty);

module.exports = router;
