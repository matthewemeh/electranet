const router = require('express').Router();

const { verifyVote } = require('../middlewares/vote.middlewares');
const { verifyToken } = require('../middlewares/user.middlewares');
const { castVote, verifyUserVote, getVotes } = require('../controllers/vote.controllers');

router.route('/cast-vote').post(verifyToken, verifyVote, castVote);

router.route('/verify-vote').post(verifyUserVote);

router.route('/').get(getVotes);

module.exports = router;
