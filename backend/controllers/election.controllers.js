const Log = require('../models/log.model');
const Election = require('../models/election.model');
const Contestant = require('../models/contestant.model');
const { getPossibleDelimCodes } = require('../utils/election.utils');

const addElection = async (req, res) => {
  try {
    const election = await Election.create(req.body);

    await Log.create({
      admin: req.admin._id,
      action: 'ELECTION_ADD',
      message: 'Added new election',
    });

    res.status(201).json({ message: 'Election created', status: 'success', data: election });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errors: null, status: 'failed', httpStatusCode: 400, message: error.message });
  }
};

const updateElection = async (req, res) => {
  let httpStatusCode = 500;
  try {
    const { id } = req.params;
    const electionPayload = req.body;

    const election = await Election.findById(id);
    if (!election) {
      httpStatusCode = 404;
      throw new Error('Election not found');
    }

    Object.entries(electionPayload).forEach(([key, value]) => {
      election[key] = value;
    });

    await election.save();

    await Log.create({
      admin: req.admin._id,
      action: 'ELECTION_UPDATE',
      message: `Update new election with id: ${id}`,
    });

    res
      .status(200)
      .json({ message: 'Election updated successfully', status: 'success', data: election });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ errors: null, status: 'failed', httpStatusCode, message: error.message });
  }
};

const deleteElection = async (req, res) => {
  let httpStatusCode = 500;
  try {
    const { id } = req.params;
    const election = await Election.findById(id);

    if (!election) {
      httpStatusCode = 404;
      throw new Error('Election not found');
    }

    if (Date.now() >= election.startTime) {
      httpStatusCode = 400;
      throw new Error('Election cannot be deleted after commencement');
    }

    const contestant = Contestant.findOne({ election: id });
    if (contestant) {
      httpStatusCode = 400;
      throw new Error('Contestant(s) are vying for this election');
    }

    await Election.findByIdAndDelete(id);

    await Log.create({
      admin: req.admin._id,
      action: 'ELECTION_DELETE',
      message: 'Deleted Election',
    });

    res
      .status(200)
      .json({ message: 'Election deleted successfully', status: 'success', data: null });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ errors: null, status: 'failed', httpStatusCode, message: error.message });
  }
};

const getUserElections = async (req, res) => {
  try {
    const { delimitationCode } = req.user;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    let paginatedElections = await Election.paginate(
      { delimitationCode: { $in: getPossibleDelimCodes(delimitationCode) } },
      { page, limit, sort: { createdAt: -1 } }
    );

    res.status(200).json({
      status: 'success',
      data: paginatedElections,
      message: 'Election fetched successfully',
    });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errors: null, status: 'failed', httpStatusCode: 400, message: error.message });
  }
};

const getElections = async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    let paginatedElections = await Election.paginate({}, { page, limit, sort: { createdAt: -1 } });

    res.status(200).json({
      status: 'success',
      data: paginatedElections,
      message: 'Election fetched successfully',
    });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errors: null, status: 'failed', httpStatusCode: 400, message: error.message });
  }
};

module.exports = { addElection, updateElection, deleteElection, getUserElections, getElections };
