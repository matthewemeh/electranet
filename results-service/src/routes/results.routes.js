const router = require('express').Router();

const { isValidID } = require('../middlewares/mongoose.middlewares');
const { getResults, getResult } = require('../controllers/results.controllers');
const { validateAuthKey, verifyToken } = require('../middlewares/auth.middlewares');

router.use(validateAuthKey, verifyToken);

router.get('/', getResults);

router.get('/:id', isValidID, getResult);

module.exports = router;
