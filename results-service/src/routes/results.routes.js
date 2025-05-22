const router = require('express').Router();

const { getResults } = require('../controllers/results.controllers');
const { validateAuthKey, verifyToken } = require('../middlewares/auth.middlewares');

router.use(validateAuthKey);

router.use(verifyToken);

router.get('/:id', getResults);

module.exports = router;
