const jwt = require('jsonwebtoken');

const Admin = require('../models/admin.model');
const AdminToken = require('../models/adminToken.model');
const { ADMIN_TOKEN_STATUS_CODES } = require('../constants');

const { ACCESS_TOKEN_SECRET } = process.env;

const verifyToken = async (req, res, next) => {
  let httpStatusCode = 403;
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      httpStatusCode = 401;
      throw new Error('An authorization token is required');
    }

    const decodedAdmin = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.admin = decodedAdmin;

    // check if admin exists in database
    const admin = await Admin.findById(req.admin.adminID);
    if (!admin) {
      httpStatusCode = 500;
      throw new Error('Admin does not exist on this platform');
    }
  } catch (error) {
    if (httpStatusCode === 403) {
      error.message = 'Session expired.';
    }
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }

  return next();
};

const verifyAdminToken = async (req, res, next) => {
  let httpStatusCode = 500;
  try {
    const { email } = req.admin;

    // check if admin token record exists in database
    const adminToken = await AdminToken.findOne({ email });
    if (!adminToken) {
      httpStatusCode = 404;
      throw new Error('No admin token available');
    }

    // check if admin token has been revoked
    const adminTokenRevoked = adminToken.status.statusCode === ADMIN_TOKEN_STATUS_CODES.REVOKED;
    if (adminTokenRevoked) {
      httpStatusCode = 403;
      throw new Error('Admin token has been revoked. Contact Super-Admin for more details');
    }

    // check if admin token has expired
    const adminTokenExpired = Date.now() > adminToken.expiresAt;
    if (adminTokenExpired) {
      httpStatusCode = 403;
      throw new Error('Admin token has expired. Contact Super-Admin for access renewal');
    }
  } catch (error) {
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }

  return next();
};

module.exports = { verifyToken, verifyAdminToken };
