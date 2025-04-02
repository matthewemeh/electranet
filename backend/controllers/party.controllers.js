const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');

const Log = require('../models/log.model');
const Party = require('../models/party.model');
const storage = require('../configs/firebase.config');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');

/* Multipart key information */
const { PAYLOAD_KEY, MEDIA_IMAGE_KEY } = require('../constants');

const addParty = async (req, res) => {
  const partyPayload = JSON.parse(
    req.files?.find(({ fieldname }) => fieldname === PAYLOAD_KEY)?.buffer ?? '{}'
  );

  const party = new Party(partyPayload);

  // upload party logo (if any) to firebase database
  const logoImage = req.files?.find(({ fieldname }) => fieldname === MEDIA_IMAGE_KEY)?.buffer;
  if (logoImage) {
    const imageRef = ref(storage, `electranet/parties/${party._id}`);
    const snapshot = await uploadBytes(imageRef, logoImage);
    const url = await getDownloadURL(snapshot.ref);
    party.logoUrl = url;
  }

  await party.save();

  await Log.create({
    admin: req.admin._id,
    action: 'PARTY_ADD',
    message: `Added new party: ${party.longName}`,
  });

  res.status(201).json({ message: 'Party added successfully', status: 'success', data: party });
};

const editParty = async (req, res) => {
  const { id } = req.params;
  const party = await Party.findById(id);
  if (!party) {
    throw new APIError('Party not found', 404);
  }

  const partyPayload = JSON.parse(
    req.files?.find(({ fieldname }) => fieldname === PAYLOAD_KEY)?.buffer ?? '{}'
  );

  Object.entries(partyPayload).forEach(([key, value]) => {
    party[key] = value;
  });

  // upload party image (if any) to firebase database
  const logoImage = req.files?.find(({ fieldname }) => fieldname === MEDIA_IMAGE_KEY)?.buffer;
  if (logoImage) {
    const imageRef = ref(storage, `electranet/parties/${party._id}`);
    const snapshot = await uploadBytes(imageRef, logoImage);
    const url = await getDownloadURL(snapshot.ref);
    party.logoUrl = url;
  }
  await party.save();

  await Log.create({
    admin: req.admin._id,
    action: 'PARTY_UPDATE',
    message: `Updated party with id: ${id}`,
  });

  res.status(200).json({ message: 'Party updated successfully', status: 'success', data: party });
};

const getParties = async (req, res) => {
  const parties = await Party.find();
  res
    .status(200)
    .json({ status: 'success', data: parties, message: 'Parties fetched successfully' });
};

module.exports = {
  addParty: asyncHandler(addParty),
  editParty: asyncHandler(editParty),
  getParties: asyncHandler(getParties),
};
