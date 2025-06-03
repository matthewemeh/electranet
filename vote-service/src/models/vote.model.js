const SHA256 = require('crypto-js/sha256');
const { Schema, model } = require('mongoose');
const encryption = require('mongoose-encryption');
const mongoosePaginate = require('mongoose-paginate-v2');

const subDocOptions = { minimize: false, _id: false, id: false };

const VoteData = new Schema(
  {
    party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    election: { type: Schema.Types.ObjectId, ref: 'Election', required: true },
    contestants: [{ type: Schema.Types.ObjectId, ref: 'Contestant', required: true }],
  },
  subDocOptions
);

const VoteSchema = new Schema(
  {
    isTailNode: { type: Boolean, required: true },
    hash: { type: String, required: true, immutable: true },
    data: { type: VoteData, required: true, immutable: true },
    timestamp: { type: Number, required: true, immutable: true },
    previousHash: { type: String, default: '', immutable: true },
    index: { type: Number, required: true, min: 0, immutable: true },
    election: { type: Schema.Types.ObjectId, ref: 'Election', required: true },
  },
  { minimize: false, collection: 'votes' }
);
VoteSchema.plugin(mongoosePaginate);
VoteSchema.plugin(encryption, {
  secret: process.env.MONGO_DB_SECRET,
  excludeFromEncryption: ['election'],
});

/**
 * Checks if user's vote is still valid by checking if vote has been tampered with
 * @param {object} previousVote - the vote just before this vote in a vote blockchain
 * @returns {boolean}
 */
VoteSchema.methods.isValid = function (previousVote) {
  const voteHash = SHA256(
    this.index + this.previousHash + this.timestamp + JSON.stringify(this.data)
  ).toString();

  if (!this.election.equals(this.data.election)) {
    return false;
  } else if (this.hash !== voteHash) {
    return false;
  } else if (previousVote && previousVote.hash !== this.previousHash) {
    return false;
  }
  return true;
};

/* Before returning json response to client, remove sensitive fields */
VoteSchema.methods.toJSON = function () {
  const vote = this.toObject();
  delete vote.data;
  delete vote.index;
  delete vote.election;
  delete vote.isTailNode;
  delete vote.previousHash;
  return vote;
};

const Vote = model('Vote', VoteSchema);
module.exports = Vote;
