const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const VoteData = new Schema(
  {
    party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    election: { type: Schema.Types.ObjectId, ref: 'Election', required: true },
  },
  { minimize: false, versionKey: false }
);

const VoteSchema = new Schema(
  {
    isTailNode: { type: Boolean, required: true },
    hash: { type: String, required: true, immutable: true },
    data: { type: VoteData, required: true, immutable: true },
    timestamp: { type: Number, required: true, immutable: true },
    previousHash: { type: String, required: true, immutable: true },
    index: { type: Number, required: true, min: 0, immutable: true },
  },
  { minimize: false, collection: 'votes' }
);
VoteSchema.plugin(mongoosePaginate);

const Vote = model('Vote', VoteSchema);

module.exports = Vote;
