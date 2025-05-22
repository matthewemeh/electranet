const moment = require('moment');
const express = require('express');
const mongoose = require('mongoose');
const { Redis } = require('ioredis');
const SHA256 = require('crypto-js/sha256');

const Vote = require('../models/vote.model');
const Result = require('../models/result.model');
const { logger } = require('../utils/logger.utils');
const Election = require('../models/election.model');
const { sendEmail } = require('../utils/email.utils');
const { sendNotification } = require('../utils/notification.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');
const { getUserKey, redisCacheExpiry, getVoteVerifyKey } = require('../utils/redis.utils');
const {
  validateCastVote,
  validateGetVotes,
  validateVerifyUserVote,
} = require('../utils/validation.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const castVote = async (req, res) => {
  logger.info('Cast Vote endpoint called');

  // validate request body
  const { error } = validateCastVote(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, 400);
  }

  const { election, user } = req;
  const { electionID, partyID, contestants } = req.body;

  // create or update results. This whole process is to avoid race conditions
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Find or create the Result document for the election
    let resultDoc = await Result.findOne({ election: electionID }).session(session);

    if (!resultDoc) {
      resultDoc = await Result.create({ results: [], election: electionID }, { session });
    }

    // Check if the party already has a result entry
    const partyIndex = resultDoc.results.findIndex(r => r.party == partyID);

    if (partyIndex === -1) {
      // Party not found – add a new result entry
      await Result.updateOne(
        { _id: resultDoc._id },
        { $push: { results: { party: partyID, contestants, votes: 1 } } },
        { session }
      );
    } else {
      // Party already exists – increment votes
      await Result.updateOne(
        { _id: resultDoc._id, 'results.party': partyID },
        { $inc: { 'results.$.votes': 1 } },
        { session }
      );
    }

    await session.commitTransaction();
  } catch (err) {
    logger.error('Voting failed:', err);
    await session.abortTransaction();

    // send user a notification and an email
    await sendNotification({
      user,
      notifyEmail: true,
      subject: 'ELECTRANET: Unsuccessful Vote Cast',
      message: `Your vote in the election: ${election.name} did not count. Please try again`,
    });

    throw err;
  } finally {
    session.endSession();
  }

  // find last vote for that election
  const lastVote = await Vote.findOne({ 'data.election': electionID, isTailVoteNode: true });

  // assume new vote is the first vote or genesis node
  const votePayload = {
    index: 0,
    hash: '',
    previousHash: '',
    isTailNode: true,
    timestamp: Date.now(),
    data: { party: partyID, election: electionID, contestants },
  };
  if (lastVote) {
    votePayload.index = lastVote.index + 1;
    votePayload.previousHash = lastVote.hash;

    lastVote.isTailNode = false;
    await lastVote.save();
  }

  // create hash for vote which protects it from mutation
  votePayload.hash = SHA256(
    votePayload.index +
      votePayload.previousHash +
      votePayload.timestamp +
      JSON.stringify(votePayload.data)
  ).toString();

  // add vote to blockchain of votes
  const vote = await Vote.create(votePayload);

  // update the user's voted elections
  user.electionsVoted.push(electionID);
  await user.save();

  // update or set user cache
  const userCacheKey = getUserKey(user.email.value);
  await req.redisClient.setex(userCacheKey, redisCacheExpiry, JSON.stringify(user.toRaw()));

  // send user a notification and an email
  await sendNotification({
    user,
    message: `You voted in the ${election.name} at ${moment(vote.createdAt).format(
      'LLL'
    )}. Your VoteID: ${vote._id} can be used to verify your vote`,
  });
  await sendEmail(
    user.email.value,
    'ELECTRANET: Vote cast successfully',
    null,
    `<p>Hi ${user.fullName}</p>
    <p>You voted in the ${election.name} at ${moment(vote.createdAt).format(
      'LLL'
    )}. You can use your VoteID below to verify your vote:</p>
    <em>${vote._id}</em>
    <p>Best regards,<span style="display:block;">Electranet.</span></p>
    `
  );

  logger.info('Voted casted successfully');
  res
    .status(200)
    .json({ success: true, data: { voteID: vote._id }, message: 'Voted casted successfully' });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const verifyUserVote = async (req, res) => {
  logger.info('Verify User Vote endpoint called');

  // validate request body
  const { error } = validateVerifyUserVote(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, 400);
  }

  const { voteID } = req.body;

  // check cached verified vote result
  const voteVerifyKey = getVoteVerifyKey(voteID);
  const result = await req.redisClient.get(voteVerifyKey);
  if (result) {
    logger.info('Vote checked successfully');
    return res
      .status(200)
      .json({ success: true, message: 'Vote checked successfully', data: JSON.parse(result) });
  }

  // check if vote exists
  const vote = await Vote.findById(voteID);
  if (!vote) {
    logger.error('Vote not found');
    throw new APIError('Vote not found', 404);
  }

  // find the vote just before this vote
  const previousVote = await Vote.findOne({
    index: vote.index - 1,
    'data.election': vote.data.election,
  });

  const election = await Election.findById(vote.data.election);
  result = {
    election,
    status: 'failed',
    vote: { timestamp: vote.timestamp, hash: vote.hash },
    message: 'Vote verification failed. Vote compromised!',
  };

  // verify that vote was not tampered with
  if (vote.isValid(previousVote)) {
    result.status = 'success';
    result.message = 'Vote verification successful';
  }

  // cache new verified vote result
  await req.redisClient.setex(voteVerifyKey, redisCacheExpiry, JSON.stringify(result));

  logger.info('Vote checked successfully');
  res.status(200).json({ success: true, message: 'Vote checked successfully', data: result });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getVotes = async (req, res) => {
  logger.info('Get Votes endpoint called');

  // validate request query
  const { error } = validateGetVotes(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, 400);
  }

  const { id } = req.params;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const queryFields = {};
  if (id) {
    queryFields['data.election'] = id;
  }
  const paginatedVotes = await Vote.paginate(queryFields, { page, limit, sort: { timestamp: -1 } });

  logger.info('Votes fetched successfully');
  res
    .status(200)
    .json({ success: true, message: 'Votes fetched successfully', data: paginatedVotes });
};

module.exports = {
  getVotes: asyncHandler(getVotes),
  castVote: asyncHandler(castVote),
  verifyUserVote: asyncHandler(verifyUserVote),
};
