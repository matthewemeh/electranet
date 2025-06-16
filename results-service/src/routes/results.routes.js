const router = require('express').Router();

const { isValidID } = require('../middlewares/mongoose.middlewares');
const { getResults } = require('../controllers/results.controllers');
const { validateAuthKey, verifyToken } = require('../middlewares/auth.middlewares');

router.use(validateAuthKey, verifyToken);

router.get('/:id', isValidID, getResults);

module.exports = router;
