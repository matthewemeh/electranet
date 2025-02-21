const Party = require('../models/party.model');
const Election = require('../models/election.model');

const verifyVote = async (req, res, next) => {
  try {
    const { electionID, partyID } = req.body;

    const electionExists = await Election.findById(electionID);
    if (!electionExists) {
      throw new Error('Election not found');
    }

    const partyExists = await Party.findById(partyID);
    if (!partyExists) {
      throw new Error('Party not found');
    }
  } catch (error) {
    return res
      .status(404)
      .json({ errors: null, httpStatusCode: 404, status: 'failed', message: error.message });
  }

  return next();
};

module.exports = { verifyVote };
