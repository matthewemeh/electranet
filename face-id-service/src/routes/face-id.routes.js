const multer = require('multer');
const router = require('express').Router();

const { registerFace, fetchUserFaceID } = require('../controllers/face-id.controllers');
const { validateAuthKey, verifyToken, verifyUser } = require('../middlewares/auth.middlewares');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(validateAuthKey, verifyToken, verifyUser);

router.get('/fetch', fetchUserFaceID);

router.post('/register', upload.any(), registerFace);

module.exports = router;
