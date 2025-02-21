const router = require('express').Router();

const { castVote } = require('../controllers/vote.controllers');
const { verifyVote } = require('../middlewares/vote.middlewares');
const { verifyToken } = require('../middlewares/user.middlewares');

router.route('/cast').post(verifyToken, verifyVote, castVote);

module.exports = router;
