const express = require('express');
const { verify } = require('argon2');
const { Redis } = require('ioredis');
const { StatusCodes } = require('http-status-codes');

const Party = require('../models/party.model');
const { logger } = require('../utils/logger.utils');
const Election = require('../models/election.model');
const { APIError, asyncHandler } = require('./error.middlewares');
const { getFaceIdTokenKey, deleteCacheKey } = require('../utils/redis.utils');

/**
 * @param {express.Request & {redisClient: Redis}} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const verifyVote = async (req, res, next) => {
  const { user } = req;
  const { electionID, partyID, faceIdToken } = req.body;

  // check if election exists
  const election = await Election.findById(electionID);
  if (!election) {
    logger.error('Election not found');
    throw new APIError('Election not found', StatusCodes.NOT_FOUND);
  }

  // check if election has started and is still ongoing
  if (!election.hasStarted) {
    logger.warn('Election has not started');
    throw new APIError('Election has not started', StatusCodes.BAD_REQUEST);
  } else if (election.hasEnded) {
    logger.warn('Election has ended');
    throw new APIError('Election has ended', StatusCodes.BAD_REQUEST);
  }

  // check if user is allowed to vote for the election
  if (!user.canVote(election.delimitationCode)) {
    throw new APIError('You cannot vote for this election', StatusCodes.BAD_REQUEST);
  }

  // check if user has voted before
  if (user.hasVoted(electionID)) {
    throw new APIError('You have voted for this election already!', StatusCodes.BAD_REQUEST);
  }

  // check if user has verified face id
  const faceIdTokenKey = getFaceIdTokenKey(user.email.value);
  const hashedFaceIdToken = await req.redisClient.get(faceIdTokenKey);
  if (!hashedFaceIdToken) {
    logger.error('Face ID token has expired!');
    throw new APIError('Face ID token has expired!', StatusCodes.GONE);
  }
  const tokenMatches = await verify(hashedFaceIdToken, faceIdToken);
  if (!tokenMatches) {
    logger.error('Invalid Face ID token!');
    throw new APIError('Invalid Face ID token!', StatusCodes.FORBIDDEN);
  }

  // invalidate face id token cache
  await deleteCacheKey(faceIdTokenKey, req.redisClient);

  // check if party exists
  const partyExists = await Party.findById(partyID);
  if (!partyExists) {
    logger.error('Party not found');
    throw new APIError('Party not found', StatusCodes.NOT_FOUND);
  }

  req.election = election;

  next();
};

module.exports = { verifyVote: asyncHandler(verifyVote) };
