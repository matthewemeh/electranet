const router = require('express').Router();

const { verifyToken: verifyUserToken } = require('../middlewares/user.middlewares');
const { verifyAdminToken, verifyToken } = require('../middlewares/admin.middlewares');
const {
  addElection,
  getElections,
  updateElection,
  deleteElection,
  getUserElections,
} = require('../controllers/election.controllers');

router.route('/').get(verifyToken, verifyAdminToken, getElections);

router.route('/').post(verifyToken, verifyAdminToken, addElection);

router.route('/:id').patch(verifyToken, verifyAdminToken, updateElection);

router.route('/:id').delete(verifyToken, verifyAdminToken, deleteElection);

router.route('/get-user-elections').get(verifyUserToken, getUserElections);

module.exports = router;
