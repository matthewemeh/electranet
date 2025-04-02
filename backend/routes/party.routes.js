const multer = require('multer');
const router = require('express').Router();

const { verifyAdminToken, verifyToken } = require('../middlewares/admin.middlewares');
const { addParty, editParty, getParties } = require('../controllers/party.controllers');

const upload = multer();

router.route('/').get(verifyToken, verifyAdminToken, getParties);

router.route('/').post(upload.any(), verifyToken, verifyAdminToken, addParty);

router.route('/:id').patch(upload.any(), verifyToken, verifyAdminToken, editParty);

module.exports = router;
