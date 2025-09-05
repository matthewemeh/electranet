const moment = require('moment');
const { hash } = require('argon2');
const express = require('express');
const mongoose = require('mongoose');
const { Redis } = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const SHA256 = require('crypto-js/sha256');
const { StatusCodes } = require('http-status-codes');

const Vote = require('../models/vote.model');
const Result = require('../models/result.model');
const { logger } = require('../utils/logger.utils');
const Election = require('../models/election.model');
const { sendEmail } = require('../utils/email.utils');
const ElectionVoted = require('../models/election-voted.model');
const { APIError } = require('../middlewares/error.middlewares');
const { sendNotification } = require('../utils/notification.utils');
const ElectionContestant = require('../models/election-contestant.model');
const { validateGetVotes, validateVerifyUserVote } = require('../utils/validation.utils');
const {
  getUserKey,
  getVotesKey,
  deleteCacheKey,
  getVoteTokenKey,
  getVoteVerifyKey,
  redisCacheExpiry,
  getElectionsVotedKey,
} = require('../utils/redis.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const castVote = async (req, res) => {
  logger.info('Cast Vote endpoint called');

  const { election, user } = req;
  const { electionID, partyID } = req.body;

  // check if there are any contestants under that party and election
  let electionContestants = await ElectionContestant.find({
    party: partyID,
    election: electionID,
  }).select('contestant -_id');
  let contestants = electionContestants.map(({ contestant }) => contestant);

  if (contestants.length === 0) {
    logger.error('No contestant found for the specified party and election');
    throw new APIError(
      'No contestant found for the specified party and election',
      StatusCodes.BAD_REQUEST
    );
  }

  // create or update results. This whole process is to avoid race conditions
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Find or create the Result document for the election
    let resultDoc = await Result.findOne({ election: electionID }).session(session);
    if (!resultDoc) {
      resultDoc = new Result({ election: electionID });
      await resultDoc.save({ session });
    }

    // Check if the party already has a result entry
    const partyIndex = resultDoc.results.findIndex(r => r.party == partyID);

    if (partyIndex === -1) {
      // Party not found – add a new result entry
      await Result.updateOne(
        { _id: resultDoc._id },
        { $push: { results: { contestants, party: partyID, votes: 1 } } },
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
  const lastVote = await Vote.findOne({ 'data.election': electionID, isTailNode: true });

  // assume new vote is the first vote or genesis node
  const votePayload = {
    index: 0,
    hash: '',
    previousHash: '',
    isTailNode: true,
    election: electionID,
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
  await ElectionVoted.create({ user: user._id, election: electionID });

  // delete user's voted election cache
  const electionsVotedCacheKey = getElectionsVotedKey(user._id);
  await deleteCacheKey(electionsVotedCacheKey, req.redisClient);

  // invalidate Vote Token
  const voteTokenKey = getVoteTokenKey(user._id);
  await deleteCacheKey(voteTokenKey, req.redisClient);

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

  logger.info('Vote cast successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Vote cast successfully', data: { voteID: vote._id } });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const verifyUserVote = async (req, res) => {
  logger.info('Verify User Vote endpoint called');

  // validate request body
  const { error, value: reqBody } = validateVerifyUserVote(req.body ?? {});
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { voteID } = reqBody;

  // check cached verified vote result
  const voteVerifyKey = getVoteVerifyKey(voteID);
  let result = await req.redisClient.get(voteVerifyKey);
  if (result) {
    logger.info('Vote checked successfully');
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: 'Vote checked successfully', data: JSON.parse(result) });
  }

  // check if vote exists
  const vote = await Vote.findById(voteID);
  if (!vote) {
    logger.error('Vote not found');
    throw new APIError('Vote not found', StatusCodes.NOT_FOUND);
  }

  // find the vote just before this vote
  const previousVote = await Vote.findOne({
    index: vote.index - 1,
    'data.election': vote.data.election,
  });

  const election = await Election.findById(vote.data.election).select('-_id name delimitationCode');
  result = {
    election,
    status: 'failed',
    voteTimestamp: vote.timestamp,
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
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Vote checked successfully', data: result });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const getVotes = async (req, res) => {
  logger.info('Get Votes endpoint called');

  // validate request query
  const { error, value: reqBody } = validateGetVotes(req.query);
  if (error) {
    logger.warn('Query Validation error', { message: error.details[0].message });
    throw new APIError(error.details[0].message, StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;
  const { page, limit, sortBy } = reqBody;

  // check for cached votes
  const votesKey = getVotesKey(id, page, limit, sortBy);
  let paginatedVotes = await req.redisClient.get(votesKey);
  if (paginatedVotes) {
    logger.info('Votes fetched successfully from cache');
    return res.status(StatusCodes.OK).json({
      success: true,
      data: JSON.parse(paginatedVotes),
      message: 'Votes fetched successfully',
    });
  }

  // fallback to DB
  const sort = sortBy ? JSON.parse(sortBy) : { timestamp: -1 };
  paginatedVotes = await Vote.paginate({ election: id }, { page, limit, sort, select: '-__v' });

  // mask hash of each vote
  paginatedVotes.docs.forEach(vote => {
    vote.hash = `${vote.hash.slice(0, 4)}****${vote.hash.slice(-4)}`;
  });

  // cache the fetched votes
  await req.redisClient.setex(votesKey, redisCacheExpiry, JSON.stringify(paginatedVotes));

  logger.info('Votes fetched successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Votes fetched successfully', data: paginatedVotes });
};

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 */
const addVoteToken = async (req, res) => {
  logger.info('Add Vote Token endpoint called');

  const token = uuidv4();
  const hashedToken = await hash(token);
  const voteTokenKey = getVoteTokenKey(req.user._id);

  await req.redisClient.setex(voteTokenKey, redisCacheExpiry, hashedToken);

  logger.info('Vote Token created successfully');
  res
    .status(StatusCodes.OK)
    .json({ success: true, message: 'Vote Token created successfully', data: { token } });
};

module.exports = { getVotes, castVote, verifyUserVote, addVoteToken };
