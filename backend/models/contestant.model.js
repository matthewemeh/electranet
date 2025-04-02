const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ContestantSchema = new Schema(
  {
    firstName: { type: String, trim: true, minLength: 2, maxLength: 64, required: true },
    lastName: { type: String, trim: true, minLength: 2, maxLength: 64, required: true },
    profileImageUrl: { type: String, required: true },
    gender: {
      type: String,
      trim: true,
      maxLength: 10,
      required: true,
      uppercase: true,
      enum: ['MALE', 'FEMALE'],
    },
    party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    otherNames: [{ type: String, trim: true, minLength: 2, maxLength: 64 }],
    election: { type: Schema.Types.ObjectId, ref: 'Election', default: null },
    stateOfOrigin: { type: String, trim: true, required: true, maxLength: 20 },
  },
  { minimize: false, timestamps: true, collection: 'contestants' }
);
ContestantSchema.plugin(mongoosePaginate);

const Contestant = model('Contestant', ContestantSchema);

module.exports = Contestant;
