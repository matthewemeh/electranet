const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');

const Log = require('../models/log.model');
const Election = require('../models/election.model');
const storage = require('../configs/firebase.config');
const Contestant = require('../models/contestant.model');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');

/* Multipart key information */
const { PAYLOAD_KEY, MEDIA_IMAGE_KEY } = require('../constants');

const addContestant = async (req, res) => {
  const contestantPayload = JSON.parse(
    req.files?.find(({ fieldname }) => fieldname === PAYLOAD_KEY)?.buffer ?? '{}'
  );

  const contestant = new Contestant(contestantPayload);

  // upload contestant profile image (if any) to firebase database
  const profileImage = req.files?.find(({ fieldname }) => fieldname === MEDIA_IMAGE_KEY)?.buffer;
  if (profileImage) {
    const imageRef = ref(storage, `electranet/contestants/${contestant._id}`);
    const snapshot = await uploadBytes(imageRef, profileImage);
    const url = await getDownloadURL(snapshot.ref);
    contestant.profileImageUrl = url;
  }

  await contestant.save();

  await Log.create({
    admin: req.admin._id,
    action: 'CONTESTANT_ADD',
    message: 'Added new contestant',
  });

  res
    .status(201)
    .json({ message: 'Contestant added successfully', status: 'success', data: contestant });
};

const updateContestant = async (req, res) => {
  const { id } = req.params;
  const contestant = await Contestant.findById(id);
  if (!contestant) {
    throw new APIError('Contestant not found', 404);
  }

  const contestantPayload = JSON.parse(
    req.files?.find(({ fieldname }) => fieldname === PAYLOAD_KEY)?.buffer ?? '{}'
  );

  const election = await Election.findById(contestantPayload.election);
  if (!election) {
    throw new APIError('Election not found', 404);
  }

  if (Date.now() >= election.startTime) {
    throw new APIError("Contestant cannot be updated after election's commencement", 400);
  }

  Object.entries(contestantPayload).forEach(([key, value]) => {
    contestant[key] = value;
  });

  // upload contestant's profile image (if any) to firebase database
  const profileImage = req.files?.find(({ fieldname }) => fieldname === MEDIA_IMAGE_KEY)?.buffer;
  if (profileImage) {
    const imageRef = ref(storage, `electranet/contestants/${contestant._id}`);
    const snapshot = await uploadBytes(imageRef, profileImage);
    const url = await getDownloadURL(snapshot.ref);
    contestant.profileImageUrl = url;
  }
  await contestant.save();

  await Log.create({
    admin: req.admin._id,
    action: 'CONTESTANT_UPDATE',
    message: `Updated contestant with id: ${id}`,
  });

  res
    .status(200)
    .json({ message: 'Contestant updated successfully', status: 'success', data: contestant });
};

const deleteContestant = async (req, res) => {
  const { id } = req.params;

  // check if contestant exists
  const contestant = await Contestant.findById(id);
  if (!contestant) {
    throw new APIError('Contestant not found', 404);
  }

  // check if an election exists where the contestant participated in by
  // simultaneously checking that the contestant's election hasn't started
  // and that there's no vote for that contestant
  const election = await Election.findOne({ contestants: id });
  if (election && Date.now() >= election.startTime) {
    throw new APIError('Contestant is a participant in an already commenced election', 400);
  }

  // delete contestant and unschedule the contestant as an election participant
  await Contestant.findByIdAndDelete(id);
  await Election.findByIdAndUpdate(contestant.election, { $pull: { contestants: id } });

  await Log.create({
    admin: req.admin._id,
    action: 'CONTESTANT_DELETE',
    message: 'Deleted Contestant',
  });

  res
    .status(200)
    .json({ message: 'Contestant deleted successfully', status: 'success', data: null });
};

const getContestants = async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const paginatedContestants = await Contestant.paginate(
    {},
    { page, limit, sort: { createdAt: -1 } }
  );

  res.status(200).json({
    status: 'success',
    data: paginatedContestants,
    message: 'Contestants fetched successfully',
  });
};

const getElectionContestants = async (req, res) => {
  const { id } = req.params;
  const election = await Election.findById(id).populate('contestants');

  res.status(200).json({
    status: 'success',
    data: election.contestants,
    message: 'Contestants fetched successfully',
  });
};

module.exports = {
  addContestant: asyncHandler(addContestant),
  getContestants: asyncHandler(getContestants),
  updateContestant: asyncHandler(updateContestant),
  deleteContestant: asyncHandler(deleteContestant),
  getElectionContestants: asyncHandler(getElectionContestants),
};
