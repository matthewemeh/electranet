const router = require('express').Router();

const { verifyVote } = require('../middlewares/vote.middlewares');
const { castVote, verifyUserVote, getVotes } = require('../controllers/vote.controllers');
const { validateAuthKey, verifyToken, verifyUser } = require('../middlewares/auth.middlewares');

router.use(validateAuthKey);

router.use(verifyToken);

router.get('/:id', getVotes);

router.use(verifyUser);

router.post('/verify', verifyUserVote);

router.post('/cast', verifyVote, castVote);

module.exports = router;
