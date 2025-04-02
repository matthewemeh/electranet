const Log = require('../models/log.model');
const Election = require('../models/election.model');
const Contestant = require('../models/contestant.model');
const { getPossibleDelimCodes } = require('../utils/election.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');

const addElection = async (req, res) => {
  const election = await Election.create(req.body);

  await Log.create({
    admin: req.admin._id,
    action: 'ELECTION_ADD',
    message: 'Added new election',
  });

  res.status(201).json({ message: 'Election created', status: 'success', data: election });
};

const updateElection = async (req, res) => {
  const { id } = req.params;
  const electionPayload = req.body;

  const election = await Election.findById(id);
  if (!election) {
    throw new APIError('Election not found', 404);
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
};

const deleteElection = async (req, res) => {
  const { id } = req.params;
  const election = await Election.findById(id);

  // check if election exists
  if (!election) {
    throw new APIError('Election not found', 404);
  }

  // check if election has started
  if (Date.now() >= election.startTime) {
    throw new APIError('Election cannot be deleted after commencement', 400);
  }

  // delete election and unset the contestant's election field
  await Election.findByIdAndDelete(id);
  await Contestant.updateMany({ election: id }, { $set: { election: null } });

  await Log.create({
    admin: req.admin._id,
    action: 'ELECTION_DELETE',
    message: 'Deleted Election',
  });

  res.status(200).json({ message: 'Election deleted successfully', status: 'success', data: null });
};

const getUserElections = async (req, res) => {
  const { delimitationCode } = req.user;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const paginatedElections = await Election.paginate(
    { delimitationCode: { $in: getPossibleDelimCodes(delimitationCode) } },
    { page, limit, sort: { createdAt: -1 } }
  );

  res.status(200).json({
    status: 'success',
    data: paginatedElections,
    message: 'Elections fetched successfully',
  });
};

const getElections = async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const paginatedElections = await Election.paginate({}, { page, limit, sort: { createdAt: -1 } });

  res.status(200).json({
    status: 'success',
    data: paginatedElections,
    message: 'Elections fetched successfully',
  });
};

const addContestant = async (req, res) => {
  const { id } = req.params;
  const { contestantID } = req.body;

  const election = await Election.findById(id);
  if (!election) {
    throw new APIError('Election not found', 404);
  }

  if (Date.now() >= election.startTime) {
    throw new APIError("Contestant cannot be added after election's commencement", 400);
  }

  if (!election.contestants.includes(contestantID)) {
    election.contestants.push(contestantID);
    await election.save();
  }
  await Contestant.findByIdAndUpdate(contestantID, { $set: { election: id } });

  res.status(200).json({ message: 'Contestant added successfully', status: 'success', data: null });
};

const removeContestant = async (req, res) => {
  const { id } = req.params;
  const { contestantID } = req.body;

  const election = await Election.findById(id);
  if (!election) {
    throw new APIError('Election not found', 404);
  }

  if (Date.now() >= election.startTime) {
    throw new APIError("Contestant cannot be removed after election's commencement", 400);
  }

  election.contestants = election.contestants.filter(contestant => contestant != contestantID);
  await election.save();
  await Contestant.findOneAndUpdate(
    { _id: contestantID, election: id },
    { $set: { election: null } }
  );

  res
    .status(200)
    .json({ message: 'Contestant removed successfully', status: 'success', data: null });
};

module.exports = {
  addElection: asyncHandler(addElection),
  getElections: asyncHandler(getElections),
  addContestant: asyncHandler(addContestant),
  deleteElection: asyncHandler(deleteElection),
  updateElection: asyncHandler(updateElection),
  getUserElections: asyncHandler(getUserElections),
  removeContestant: asyncHandler(removeContestant),
};
