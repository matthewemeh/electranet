const moment = require('moment');
const express = require('express');

const { ROLES } = require('../constants');
const Log = require('../models/log.model');
const User = require('../models/user.model');
const { logger } = require('../utils/logger.utils');
const { sendEmail } = require('../utils/email.utils');
const AdminToken = require('../models/admin-token.model');
const { validateAdminInvite } = require('../utils/validation.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');
const { fetchData, getUsersKey, redisCacheExpiry, getUserKey } = require('../utils/redis.utils');

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
const getUsers = async (req, res) => {
  logger.info('Get Users endpoint called');

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  // check cache for users
  const usersCacheKey = getUsersKey(page, limit);
  const cachedUsers = await req.redisClient.get(usersCacheKey);
  if (cachedUsers) {
    logger.info('Users fetched successfully');
    return res.status(200).json({
      success: true,
      data: JSON.parse(cachedUsers),
      message: 'Users fetched successfully',
    });
  }

  // fallback to DB
  const users = await User.paginate({}, { page, limit, sort: { createdAt: -1 } });

  // cache fetched users
  await req.redisClient.setex(usersCacheKey, redisCacheExpiry, JSON.stringify(users));

  logger.info('Users fetched successfully');
  res.status(200).json({ success: true, message: 'Users fetched successfully', data: users });
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
const inviteAdmin = async (req, res) => {
  logger.info('Invite Admin endpoint called');

  // validate the request body
  const { error } = validateAdminInvite(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, 400);
  }

  const { _id } = req.user;
  const { expiresAt, userID } = req.body;

  // check that super admin is not inviting himself/herself
  if (_id == userID) {
    logger.warn('Redundant invite: User is the Super Admin');
    throw new APIError('Redundant invite: User is the Super Admin', 400);
  }

  // check that new invitee is registered as an admin
  const userCacheKey = getUserKey(userID);
  const user = await fetchData(
    userCacheKey,
    { _id: userID, role: { $ne: ROLES.USER } },
    User,
    req.redisClient
  );
  if (!user) {
    logger.error('User has not registered as an admin on the plaform');
    throw new APIError('User has not registered as an admin on the plaform', 404);
  }

  try {
    // create new admin token for invitee
    await AdminToken.create({ expiresAt, user: userID });
  } catch (error) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      error.customMessage = 'Admin Token already exists for the user';
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
  res.status(200).json({ success: true, message: 'Invitation sent', data: null });
};

module.exports = {
  getUsers: asyncHandler(getUsers),
  inviteAdmin: asyncHandler(inviteAdmin),
};
