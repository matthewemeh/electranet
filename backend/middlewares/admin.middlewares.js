const jwt = require('jsonwebtoken');

const Token = require('../models/token.model');
const Admin = require('../models/admin.model');
const AdminToken = require('../models/adminToken.model');
const { verifyHashedData } = require('../utils/hash.utils');
const { APIError, asyncHandler } = require('./error.middlewares');
const { ADMIN_TOKEN_STATUS_CODES, ROLES } = require('../constants');

const { ACCESS_TOKEN_SECRET } = process.env;

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    throw new APIError('An authorization token is required', 401);
  }

  let decodedAdmin;
  try {
    decodedAdmin = jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new APIError('Session expired', 403);
  }

  // check if token exists in database
  const tokenRecord = await Token.findOne({ email: decodedAdmin.email });
  if (!tokenRecord) {
    throw new APIError('No token available', 404);
  }

  // check if token is valid
  const tokenMatches = await verifyHashedData(token, tokenRecord.accessToken);
  if (!tokenMatches) {
    throw new APIError('Invalid token provided', 400);
  }

  // check if admin exists in database
  const admin = await Admin.findById(decodedAdmin._id);
  if (!admin) {
    throw new APIError('Admin does not exist on this platform', 500);
  }
  req.admin = admin;

  return next();
};

const verifyAdminToken = async (req, res, next) => {
  const { email, role } = req.admin;

  if (role === ROLES.SUPER_ADMIN) {
    return next();
  }

  // check if admin token record exists in database
  const adminToken = await AdminToken.findOne({ email });
  if (!adminToken) {
    throw new APIError('No admin rights available. Request rights from Super-Admin', 404);
  }

  // check if admin token has been revoked
  const adminTokenRevoked = adminToken.status.statusCode === ADMIN_TOKEN_STATUS_CODES.REVOKED;
  if (adminTokenRevoked) {
    throw new APIError('Admin rights have been revoked. Contact Super-Admin for more details', 403);
  }

  // check if admin token has expired
  const adminTokenExpired = Date.now() > adminToken.expiresAt;
  if (adminTokenExpired) {
    throw new APIError('Admin rights have expired. Contact Super-Admin for access renewal', 403);
  }

  return next();
};

const verifySuperAdmin = async (req, res, next) => {
  if (req.admin.role !== ROLES.SUPER_ADMIN) {
    throw new APIError('Unauthorized!', 403);
  }

  return next();
};

const verifyRefreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new APIError('An authorization token is required', 401);
  }

  // verify refresh token
  const decodedAdmin = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

  // check if refreshToken exists in database
  const tokenRecord = await Token.findOne({ email: decodedAdmin.email });
  if (!tokenRecord) {
    throw new APIError('No refresh token available', 404);
  }

  // check if token is valid
  const tokenMatches = await verifyHashedData(refreshToken, tokenRecord.refreshToken);
  if (!tokenMatches) {
    throw new APIError('Invalid token provided', 400);
  }

  // check if admin exists in database
  const admin = await Admin.findById(decodedAdmin._id);
  if (!admin) {
    throw new APIError('Admin does not exist on this platform', 500);
  }
  req.admin = admin;

  return next();
};

module.exports = {
  verifyToken: asyncHandler(verifyToken),
  verifyAdminToken: asyncHandler(verifyAdminToken),
  verifySuperAdmin: asyncHandler(verifySuperAdmin),
  verifyRefreshToken: asyncHandler(verifyRefreshToken),
};
