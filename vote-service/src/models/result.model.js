const { Schema, model } = require('mongoose');

const subDocOptions = { minimize: false, _id: false, id: false };

const ResultsSchema = new Schema(
  {
    votes: { type: Number, min: 0, default: 0 },
    party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    contestants: [{ type: Schema.Types.ObjectId, ref: 'Contestant', required: true }],
  },
  subDocOptions
);

const ResultSchema = new Schema(
  {
    results: [{ type: ResultsSchema }],
    election: { type: Schema.Types.ObjectId, ref: 'Election', unique: true, required: true },
  },
  { minimize: false, timestamps: true, collection: 'results' }
);

const Result = model('Result', ResultSchema);
module.exports = Result;
