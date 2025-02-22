const jwt = require('jsonwebtoken');

const Token = require('../models/token.model');
const Admin = require('../models/admin.model');
const AdminToken = require('../models/adminToken.model');
const { verifyHashedData } = require('../utils/hash.utils');
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

    // check if token exists in database
    const tokenRecord = await Token.findOne({ email: req.admin.email });
    if (!tokenRecord) {
      httpStatusCode = 404;
      throw new Error('No token available');
    }

    // check if token is valid
    const tokenMatches = await verifyHashedData(token, tokenRecord.accessToken);
    if (!tokenMatches) {
      httpStatusCode = 400;
      throw new Error('Invalid token provided');
    }

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
      throw new Error('No admin rights available. Request rights from Super-Admin');
    }

    // check if admin token has been revoked
    const adminTokenRevoked = adminToken.status.statusCode === ADMIN_TOKEN_STATUS_CODES.REVOKED;
    if (adminTokenRevoked) {
      httpStatusCode = 403;
      throw new Error('Admin rights have been revoked. Contact Super-Admin for more details');
    }

    // check if admin token has expired
    const adminTokenExpired = Date.now() > adminToken.expiresAt;
    if (adminTokenExpired) {
      httpStatusCode = 403;
      throw new Error('Admin rights have expired. Contact Super-Admin for access renewal');
    }
  } catch (error) {
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }

  return next();
};

const verifyRefreshToken = async (req, res, next) => {
  let httpStatusCode = 403;
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      httpStatusCode = 401;
      throw new Error('An authorization token is required');
    }

    // verify refresh token
    const decodedAdmin = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    req.admin = decodedAdmin;

    // check if refreshToken exists in database
    const tokenRecord = await Token.findOne({ email: req.admin.email });
    if (!tokenRecord) {
      httpStatusCode = 404;
      throw new Error('No refresh token available');
    }

    // check if token is valid
    const tokenMatches = await verifyHashedData(refreshToken, tokenRecord.refreshToken);
    if (!tokenMatches) {
      httpStatusCode = 400;
      throw new Error('Invalid token provided');
    }

    // check if admin exists in database
    const admin = await Admin.findById(req.admin.adminID);
    if (!admin) {
      httpStatusCode = 500;
      throw new Error('Admin does not exist on this platform');
    }
  } catch (error) {
    if (httpStatusCode === 403) {
      error.message = 'Session expired. Please login to start new session';
    }
    console.log(error);
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }
  return next();
};

module.exports = { verifyToken, verifyAdminToken, verifyRefreshToken };
