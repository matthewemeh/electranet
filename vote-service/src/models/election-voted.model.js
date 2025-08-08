const { Schema, model, Types } = require('mongoose');

const ElectionVotedSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, immutable: true },
    election: { type: Types.ObjectId, ref: 'Election', required: true, immutable: true },
  },
  { minimize: false, timestamps: true, collection: 'electionsVoted' }
);

ElectionVotedSchema.index({ user: 1, election: 1 }, { unique: true });

const ElectionVoted = model('ElectionVoted', ElectionVotedSchema);
module.exports = ElectionVoted;
