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

router.use(validateAuthKey);

router.use(verifyToken);

router.get('/:id', getElectionContestants);

router.use(verifyAdminToken);

router.get('/', getContestants);

router.post('/', addContestant);

router.patch('/:id', updateContestant);

module.exports = router;
