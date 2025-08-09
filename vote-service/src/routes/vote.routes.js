const router = require('express').Router();

const { verifyVote } = require('../middlewares/vote.middlewares');
const { isValidID } = require('../middlewares/mongoose.middlewares');
const { validateAuthKey, verifyToken, verifyUser } = require('../middlewares/auth.middlewares');
const {
  getVotes,
  castVote,
  addVoteToken,
  verifyUserVote,
} = require('../controllers/vote.controllers');

router.use(validateAuthKey, verifyToken);

router.get('/:id', isValidID, getVotes);

router.use(verifyUser);

router.post('/token', addVoteToken);

router.post('/verify', verifyUserVote);

router.post('/cast', verifyVote, castVote);

module.exports = router;
