const { Schema, model, Types } = require('mongoose');

const ElectionContestantSchema = new Schema(
  {
    party: { type: Types.ObjectId, ref: 'Party', required: true, immutable: true },
    election: { type: Types.ObjectId, ref: 'Election', required: true, immutable: true },
    contestant: { type: Types.ObjectId, ref: 'Contestant', required: true, immutable: true },
  },
  { minimize: false, timestamps: true, collection: 'electionContestants' }
);

ElectionContestantSchema.index({ contestant: 1, election: 1 }, { unique: true });

const ElectionContestant = model('ElectionContestant', ElectionContestantSchema);
module.exports = ElectionContestant;
