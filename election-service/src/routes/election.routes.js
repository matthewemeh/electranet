const router = require('express').Router();

const { isValidID } = require('../middlewares/mongoose.middlewares');
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
  getUserVotedElections,
} = require('../controllers/election.controllers');

router.use(validateAuthKey, verifyToken);

router.get('/get-user-elections', verifyUser, getUserElections);

router.get('/get-user-voted-elections', verifyUser, getUserVotedElections);

router.use(verifyAdminToken);

router.get('/', getElections);

router.post('/', addElection);

router.patch('/:id', isValidID, updateElection);

router.delete('/:id', isValidID, deleteElection);

router.patch('/add-contestant/:id', isValidID, addContestant);

router.patch('/remove-contestant/:id', isValidID, removeContestant);

module.exports = router;
