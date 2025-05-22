const multer = require('multer');
const router = require('express').Router();

const { registerFace, verifyFace } = require('../controllers/face-id.controllers');
const { validateAuthKey, verifyToken, verifyUser } = require('../middlewares/auth.middlewares');

const upload = multer();

router.use(validateAuthKey);

router.use(verifyToken);

router.use(verifyUser);

router.use(upload.any());

router.post('/verify', verifyFace);

router.post('/register', registerFace);

module.exports = router;
