const multer = require('multer');
const router = require('express').Router();

const { isValidID } = require('../middlewares/mongoose.middlewares');
const {
  verifyToken,
  validateAuthKey,
  verifyAdminToken,
} = require('../middlewares/auth.middlewares');
const {
  addContestant,
  getContestants,
  updateContestant,
  deleteContestant,
  getElectionContestants,
} = require('../controllers/contestant.controllers');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(validateAuthKey, verifyToken);

router.get('/:id', isValidID, getElectionContestants);

router.use(verifyAdminToken);

router.get('/', getContestants);

router.post('/add', upload.any(), addContestant);

router.delete('/delete/:id', isValidID, deleteContestant);

router.patch('/edit/:id', isValidID, upload.any(), updateContestant);

module.exports = router;
