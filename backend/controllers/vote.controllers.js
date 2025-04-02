const moment = require('moment');
const SHA256 = require('crypto-js/sha256');

const User = require('../models/user.model');
const Vote = require('../models/vote.model');
const Election = require('../models/election.model');
const { sendEmail } = require('../utils/email.utils');
const { validateVote } = require('../utils/vote.utils');
const { sendNotification } = require('../utils/notification.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');

const castVote = async (req, res) => {
  const { election, user } = req;
  const { electionID, partyID, contestants } = req.body;

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
  await User.updateOne({ email: user.email }, { $push: { electionsVoted: electionID } });
  user.electionsVoted.push(electionID);

  await sendNotification({
    id: user._id,
    role: user.role,
    message: `You voted in the ${election.name} at ${moment(vote.createdAt).format(
      'LLL'
    )}. Your VoteID: ${vote._id} can be used to verify your vote`,
  });

  await sendEmail({
    email: user.email,
    subject: 'ELECTRANET: Vote cast successfully',
    html: `<p>Hello from Electranet!</p>
    <p>You voted in the ${election.name} at ${moment(vote.createdAt).format(
      'LLL'
    )}. You can use your VoteID below to verify your vote:</p>
    <em>${vote._id}</em>
    <p>Best regards,<span style="display:block;">Electranet.</span></p>
    `,
  });

  res.status(200).json({
    status: 'success',
    data: { user, voteID: vote._id },
    message: 'Voted casted successfully',
  });
};

const verifyUserVote = async (req, res) => {
  const vote = await Vote.findById(req.body.voteID);

  if (!vote) {
    throw new APIError('Vote not found', 404);
  }

  const previousVote = await Vote.findOne({
    index: vote.index - 1,
    'data.election': vote.data.election,
  });
  const election = await Election.findById(vote.data.election);
  const result = {
    election,
    status: 'failed',
    vote: { timestamp: vote.timestamp, hash: vote.hash },
    message: 'Vote verification failed. Vote compromised!',
  };

  if (validateVote(vote, previousVote)) {
    result.status = 'success';
    result.message = 'Vote verification successful';
  }

  res.status(200).json({ message: 'Vote checked successfully', status: 'success', data: result });
};

const getVotes = async (req, res) => {
  const { electionID } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const queryFields = {};
  if (electionID) {
    queryFields['data.election'] = electionID;
  }
  const paginatedVotes = await Vote.paginate(queryFields, { page, limit, sort: { timestamp: -1 } });

  res
    .status(200)
    .json({ message: 'Votes fetched successfully', status: 'success', data: paginatedVotes });
};

module.exports = {
  getVotes: asyncHandler(getVotes),
  castVote: asyncHandler(castVote),
  verifyUserVote: asyncHandler(verifyUserVote),
};
