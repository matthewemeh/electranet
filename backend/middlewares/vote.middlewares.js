const Party = require('../models/party.model');
const Election = require('../models/election.model');
const { APIError, asyncHandler } = require('./error.middlewares');

const verifyVote = async (req, res, next) => {
  const { electionID, partyID } = req.body;

  // check if election exists
  const election = await Election.findById(electionID);
  if (!election) {
    throw new APIError('Election not found', 404);
  }

  // check if election has started and is still on
  const now = Date.now();
  if (now < election.startTime) {
    throw new APIError('Election has not started', 400);
  } else if (now > election.endTime) {
    throw new APIError('Election has ended', 400);
  }

  // check if user is allowed to vote for the election
  if (!req.user.delimitationCode.startsWith(election.delimitationCode)) {
    throw new APIError('You cannot vote for this election', 400);
  }

  // check if user has voted before
  if (req.user.electionsVoted.indexOf(electionID) !== -1) {
    throw new APIError('You have voted for this election already!', 400);
  }

  const partyExists = await Party.findById(partyID);
  if (!partyExists) {
    throw new APIError('Party not found', 404);
  }

  req.election = election;

  return next();
};

module.exports = { verifyVote: asyncHandler(verifyVote) };
