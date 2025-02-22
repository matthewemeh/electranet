const SHA256 = require('crypto-js/sha256');

const User = require('../models/user.model');
const Vote = require('../models/vote.model');

const castVote = async (req, res) => {
  try {
    const { userID } = req.user;
    const { electionID, partyID } = req.body;

    // check if user has voted before
    const user = await User.findById(userID);
    if (user.electionsVoted.indexOf(electionID) !== -1) {
      throw new Error('You have voted for this election already!');
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
      data: { party: partyID, election: electionID },
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
    await Vote.create(votePayload);

    // update the user's voted elections
    user.electionsVoted.push(electionID);
    await user.save();

    res.status(200).json({ message: 'Voted casted successfully', status: 'success', data: user });
  } catch (error) {
    res
      .status(400)
      .json({ message: error.message, status: 'failed', httpStatusCode: 400, errors: null });
  }
};

module.exports = { castVote };
