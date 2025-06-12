const moment = require('moment');
const express = require('express');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const { ROLES } = require('../constants');
const Log = require('../models/log.model');
const User = require('../models/user.model');
const { logger } = require('../utils/logger.utils');
const { sendEmail } = require('../utils/email.utils');
const AdminToken = require('../models/admin-token.model');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');
const {
  validateGetUsers,
  validateAdminInvite,
  validateModifyToken,
  validateGetAdminTokens,
} = require('../utils/validation.utils');
const {
  fetchData,
  getUserKey,
  getUsersKey,
  getAdminTokenKey,
  redisCacheExpiry,
  getAdminTokensKey,
} = require('../utils/redis.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getUsers = async (req, res) => {
  logger.info('Get Users endpoint called');

  // validate the request query
  const { error, value } = validateGetUsers(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { role: adminRole } = req.user;
  const { page, limit, ...docQuery } = value;
  const { delimitationCode, email, firstName, lastName, role } = docQuery;

  // check cache for users
  const usersCacheKey = getUsersKey(
    adminRole,
    page,
    limit,
    role,
    email,
    lastName,
    firstName,
    delimitationCode
  );
  let paginatedUsers = await req.redisClient.get(usersCacheKey);
  if (paginatedUsers) {
    logger.info('Users fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedUsers),
      message: 'Users fetched successfully',
    });
  }

  // remove undefined fields
  const rawFilters = { delimitationCode, email, firstName, lastName };
  const paginationFilters = Object.fromEntries(
    Object.entries(rawFilters).filter(([_, v]) => v !== undefined)
  );
  if (adminRole === ROLES.SUPER_ADMIN) {
    /* 
      if user is the Super Admin, then make sure his/her user data is not fetched
      if the users are fetched by their role, then ensure those user types are fetched
    */
    paginationFilters.role = role && role !== ROLES.SUPER_ADMIN ? role : { $ne: ROLES.SUPER_ADMIN };
  } else if (adminRole === ROLES.ADMIN) {
    // if user is an Admin, then make sure only users are fetched
    paginationFilters.role = ROLES.USER;
  }

  // fallback to DB
  paginatedUsers = await User.paginate(paginationFilters, {
    page,
    limit,
    sort: { createdAt: -1 },
  });

  // cache fetched users
  await req.redisClient.setex(usersCacheKey, redisCacheExpiry, JSON.stringify(paginatedUsers));

  logger.info('Users fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Users fetched successfully', data: paginatedUsers });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const inviteAdmin = async (req, res) => {
  logger.info('Invite Admin endpoint called');

  // validate the request body
  const { error } = validateAdminInvite(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { _id } = req.user;
  const { expiresAt, userID } = req.body;

  // check that super admin is not inviting himself/herself
  if (_id == userID) {
    logger.warn('Redundant invite: User is the Super Admin');
    throw new APIError('Redundant invite: User is the Super Admin', StatusCodes.BAD_REQUEST);
  }

  // check that new invitee is registered as an admin
  const userCacheKey = getUserKey(userID);
  const user = await fetchData(
    userCacheKey,
    { _id: userID, role: ROLES.ADMIN },
    User,
    req.redisClient
  );
  if (!user) {
    logger.error('User has not registered as an admin on the platform');
    throw new APIError(
      'User has not registered as an admin on the platform',
      StatusCodes.NOT_FOUND
    );
  }

  try {
    // create new admin token for invitee
    await AdminToken.create({ expiresAt, user: userID });
  } catch (error) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      error.customMessage = 'User has already been invited';
      throw error;
    }
  }

  // alert invitee of the admin invite
  await sendEmail(
    user.email.value,
    'ELECTRANET: Admin Invite',
    null,
    `<p>Hello from Electranet! You have been invited to be an Admin on ELECTRANET. You will aid users who come to the polling unit with their voting process</p>
    ${
      expiresAt ? `<p>Your Admin access will expire on ${moment(expiresAt).format('LLL')}</p>` : ''
    }`
  );

  // then log event
  await Log.create({
    user: _id,
    action: 'INVITE',
    message: `Invited Admin with email: ${user.email.value}`,
  });

  logger.info('Invitation sent');
  res.status(StatusCodes.OK).json({ success: true, message: 'Invitation sent', data: null });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const modifyAdminToken = async (req, res) => {
  logger.info('Modify Admin Rights endpoint called');

  // validate the request body
  const { error } = validateModifyToken(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;
  const { expiresAt, statusCode } = req.body;

  // check that admin token exists
  const adminToken = await AdminToken.findById(id);
  if (!adminToken) {
    logger.error('Admin Token not found');
    throw new APIError('Admin Token not found', StatusCodes.NOT_FOUND);
  }

  // modify admin token
  if (statusCode) {
    adminToken.statusCode = statusCode;
  }
  if (expiresAt) {
    if (expiresAt > -1) {
      adminToken.expiresAt = expiresAt;
    } else if (expiresAt === -1) {
      adminToken.set('expiresAt', undefined);
    }
  }
  await adminToken.save();

  // update admin token cache
  const adminTokenCacheKey = getAdminTokenKey(adminToken.user);
  await req.redisClient.setex(adminTokenCacheKey, redisCacheExpiry, JSON.stringify(adminToken));

  logger.info('Admin rights modified successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Admin rights modified successfully', data: null });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getAdminTokens = async (req, res) => {
  logger.info('Get Admin Tokens endpoint called');

  // validate the request query
  const { error, value } = validateGetAdminTokens(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { page, limit } = value;

  // check cached admin tokens
  const tokensCacheKey = getAdminTokensKey(page, limit);
  let paginatedAdminTokens = await req.redisClient.get(tokensCacheKey);
  if (paginatedAdminTokens) {
    logger.info('Admin Tokens fetched successfully');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedAdminTokens),
      message: 'Admin Tokens fetched successfully',
    });
  }

  // fallback to DB
  paginatedAdminTokens = await AdminToken.paginate(
    {},
    {
      page,
      limit,
      sort: { createdAt: -1 },
      select: '-updatedAt -__v',
      populate: { path: 'user', select: 'firstName lastName email.value -_id' },
    }
  );

  // cache fetched admin tokens
  await req.redisClient.setex(
    tokensCacheKey,
    redisCacheExpiry,
    JSON.stringify(paginatedAdminTokens)
  );

  logger.info('Admin Tokens fetched successfully');
  res.status(StatusCodes.OK).json({
    success: true,
    data: paginatedAdminTokens,
    message: 'Admin Tokens fetched successfully',
  });
};

module.exports = {
  getUsers: asyncHandler(getUsers),
  inviteAdmin: asyncHandler(inviteAdmin),
  getAdminTokens: asyncHandler(getAdminTokens),
  modifyAdminToken: asyncHandler(modifyAdminToken),
};
