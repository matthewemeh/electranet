const multer = require('multer');
const router = require('express').Router();

const {
  verifyToken,
  validateAuthKey,
  verifyAdminToken,
} = require('../middlewares/auth.middlewares');
const {
  addContestant,
  getContestants,
  updateContestant,
  getElectionContestants,
} = require('../controllers/contestant.controllers');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(validateAuthKey);

router.use(verifyToken);

router.get('/:id', getElectionContestants);

router.use(verifyAdminToken);

router.get('/', getContestants);

router.post('/add', upload.any(), addContestant);

router.patch('/edit/:id', upload.any(), updateContestant);

module.exports = router;
