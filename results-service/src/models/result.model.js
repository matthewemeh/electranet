const { Schema, model, Types } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const subDocOptions = { minimize: false, _id: false, id: false };

const ResultsSchema = new Schema(
  {
    votes: { type: Number, min: 0, default: 0 },
    party: { type: Types.ObjectId, ref: 'Party', required: true },
    contestants: [{ type: Types.ObjectId, ref: 'Contestant', required: true }],
  },
  subDocOptions
);

const ResultSchema = new Schema(
  {
    results: [{ type: ResultsSchema }],
    election: { type: Types.ObjectId, ref: 'Election', unique: true, required: true },
  },
  {
    id: false,
    minimize: false,
    timestamps: true,
    collection: 'results',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
ResultSchema.plugin(mongoosePaginate);

ResultSchema.virtual('totalVotes').get(function () {
  const totalVotes = this.results.reduce((sum, item) => sum + item.votes, 0);
  return totalVotes;
});

const Result = model('Result', ResultSchema);
module.exports = Result;
