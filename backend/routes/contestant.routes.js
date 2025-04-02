const multer = require('multer');
const router = require('express').Router();

const { verifyAdminToken, verifyToken } = require('../middlewares/admin.middlewares');
const {
  addContestant,
  getContestants,
  updateContestant,
  deleteContestant,
  getElectionContestants,
} = require('../controllers/contestant.controllers');

const upload = multer();

router.route('/').get(verifyToken, verifyAdminToken, getContestants);

router.route('/').post(upload.any(), verifyToken, verifyAdminToken, addContestant);

router.route('/:id').delete(verifyToken, verifyAdminToken, deleteContestant);

router.route('/:id').patch(upload.any(), verifyToken, verifyAdminToken, updateContestant);

router.route('/:id').get(getElectionContestants);

module.exports = router;
