const Party = require('../models/party.model');
const Election = require('../models/election.model');

const verifyVote = async (req, res, next) => {
  let httpStatusCode = 400;
  try {
    const { electionID, partyID } = req.body;

    // check if election exists
    const election = await Election.findById(electionID);
    if (!election) {
      httpStatusCode = 404;
      throw new Error('Election not found');
    }

    // check if election has started and is still on
    const now = Date.now();
    if (now < election.startTime) {
      throw new Error('Election has not started');
    } else if (now > election.endTime) {
      throw new Error('Election has ended');
    }

    // check if user is allowed to vote for the election
    if (!req.user.delimitationCode.startsWith(election.delimitationCode)) {
      throw new Error('You cannot vote for this election');
    }

    // check if user has voted before
    if (req.user.electionsVoted.indexOf(electionID) !== -1) {
      throw new Error('You have voted for this election already!');
    }

    const partyExists = await Party.findById(partyID);
    if (!partyExists) {
      httpStatusCode = 404;
      throw new Error('Party not found');
    }

    req.election = election;
  } catch (error) {
    return res
      .status(httpStatusCode)
      .json({ errors: null, httpStatusCode, status: 'failed', message: error.message });
  }

  return next();
};

module.exports = { verifyVote };
