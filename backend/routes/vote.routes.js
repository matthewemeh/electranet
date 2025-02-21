const router = require('express').Router();

const { castVote } = require('../controllers/vote.controller');
const { verifyToken } = require('../middlewares/user.middlewares');

router.route('/cast').post(verifyToken, castVote);

module.exports = router;
