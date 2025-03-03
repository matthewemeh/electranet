const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');

const Log = require('../models/log.model');
const Election = require('../models/election.model');
const storage = require('../configs/firebase.config');
const Contestant = require('../models/contestant.model');

/* Multipart key information */
const { PAYLOAD_KEY, MEDIA_IMAGE_KEY } = require('../constants');

const addContestant = async (req, res) => {
  let httpStatusCode = 400;
  try {
    const contestantPayload = JSON.parse(
      req.files?.find(({ fieldname }) => fieldname === PAYLOAD_KEY)?.buffer ?? '{}'
    );

    const election = await Election.findById(contestantPayload.election);
    if (!election) {
      httpStatusCode = 404;
      throw new Error('Election not found');
    }

    if (Date.now() >= election.startTime) {
      httpStatusCode = 400;
      throw new Error("Contestant cannot be added after election's commencement");
    }

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
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ errors: null, status: 'failed', httpStatusCode, message: error.message });
  }
};

const updateContestant = async (req, res) => {
  let httpStatusCode = 500;
  try {
    const { id } = req.params;
    const contestant = await Contestant.findById(id);
    if (!contestant) {
      httpStatusCode = 404;
      throw new Error('Contestant not found');
    }

    const contestantPayload = JSON.parse(
      req.files?.find(({ fieldname }) => fieldname === PAYLOAD_KEY)?.buffer ?? '{}'
    );

    const election = await Election.findById(contestantPayload.election);
    if (!election) {
      httpStatusCode = 404;
      throw new Error('Election not found');
    }

    if (Date.now() >= election.startTime) {
      httpStatusCode = 400;
      throw new Error("Contestant cannot be added after election's commencement");
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
      message: `Update contestant with id: ${id}`,
    });

    res
      .status(200)
      .json({ message: 'Contestant updated successfully', status: 'success', data: contestant });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ errors: null, status: 'failed', httpStatusCode, message: error.message });
  }
};

const deleteContestant = async (req, res) => {
  let httpStatusCode = 500;
  try {
    const { id } = req.params;
    const contestant = await Contestant.findById(id);

    if (!contestant) {
      httpStatusCode = 404;
      throw new Error('Contestant not found');
    }

    const election = await Election.findById(contestant.election);

    if (!election) {
      throw new Error('Election not found');
    }

    if (Date.now() >= election.startTime) {
      httpStatusCode = 400;
      throw new Error("Contestant cannot be deleted after election's commencement");
    }

    await Contestant.findByIdAndDelete(id);

    await Log.create({
      admin: req.admin._id,
      action: 'CONTESTANT_DELETE',
      message: 'Deleted Contestant',
    });

    res
      .status(200)
      .json({ message: 'Contestant deleted successfully', status: 'success', data: null });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatusCode)
      .json({ errors: null, status: 'failed', httpStatusCode, message: error.message });
  }
};

const getContestants = async (req, res) => {};

const getElectionContestants = async (req, res) => {};

module.exports = {
  addContestant,
  getContestants,
  updateContestant,
  deleteContestant,
  getElectionContestants,
};
