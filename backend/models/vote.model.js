const { Schema, model } = require('mongoose');
const encryption = require('mongoose-encryption');
const mongoosePaginate = require('mongoose-paginate-v2');

const VoteData = new Schema(
  {
    party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    election: { type: Schema.Types.ObjectId, ref: 'Election', required: true },
    contestants: [{ type: Schema.Types.ObjectId, ref: 'Contestant', required: true }],
  },
  { minimize: false, versionKey: false, _id: false }
);

const VoteSchema = new Schema(
  {
    isTailNode: { type: Boolean, required: true },
    hash: { type: String, required: true, immutable: true },
    data: { type: VoteData, required: true, immutable: true },
    timestamp: { type: Number, required: true, immutable: true },
    previousHash: { type: String, default: '', immutable: true },
    index: { type: Number, required: true, min: 0, immutable: true },
  },
  { minimize: false, collection: 'votes' }
);
VoteSchema.plugin(mongoosePaginate);
VoteSchema.plugin(encryption, { secret: process.env.MONGO_DB_SECRET });

/* Before returning json response to client, remove sensitive fields */
VoteSchema.methods.toJSON = function () {
  const vote = this.toObject();
  delete vote.index;
  delete vote.isTailNode;
  delete vote.previousHash;
  delete vote.data.party;
  delete vote.data.contestants;
  return vote;
};

const Vote = model('Vote', VoteSchema);

module.exports = Vote;
