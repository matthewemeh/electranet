const router = require('express').Router();

const { verifyAdminToken, verifyToken } = require('../middlewares/admin.middlewares');
const {
  addContestant,
  getContestants,
  updateContestant,
  deleteContestant,
  getElectionContestants,
} = require('../controllers/contestant.controllers');

router.route('/').get(verifyToken, verifyAdminToken, getContestants);

router.route('/').post(verifyToken, verifyAdminToken, addContestant);

router.route('/:id').patch(verifyToken, verifyAdminToken, updateContestant);

router.route('/:id').delete(verifyToken, verifyAdminToken, deleteContestant);

router.route('/get-election-contestants').get(getElectionContestants);

module.exports = router;
