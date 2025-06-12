const router = require('express').Router();

const {
  verifyUser,
  verifyToken,
  validateAuthKey,
  verifyAdminToken,
} = require('../middlewares/auth.middlewares');
const {
  addElection,
  getElections,
  addContestant,
  updateElection,
  deleteElection,
  removeContestant,
  getUserElections,
} = require('../controllers/election.controllers');

router.use(validateAuthKey, verifyToken);

router.get('/get-user-elections', verifyUser, getUserElections);

router.use(verifyAdminToken);

router.get('/', getElections);

router.post('/', addElection);

router.patch('/:id', updateElection);

router.delete('/:id', deleteElection);

router.patch('/add-contestant/:id', addContestant);

router.patch('/remove-contestant/:id', removeContestant);

module.exports = router;
