const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ContestantSchema = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
      minLength: 2,
      maxLength: 64,
      required: [true, 'is required'],
    },
    lastName: {
      type: String,
      trim: true,
      minLength: 2,
      maxLength: 64,
      required: [true, 'is required'],
    },
    profileImageUrl: { type: String, required: true },
    gender: {
      type: String,
      trim: true,
      maxLength: 10,
      uppercase: true,
      enum: ['MALE', 'FEMALE'],
      required: [true, 'is required'],
    },
    party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    otherNames: [{ type: String, trim: true, minLength: 2, maxLength: 64 }],
    stateOfOrigin: { type: String, trim: true, required: true, maxLength: 20 },
    election: { type: Schema.Types.ObjectId, ref: 'Election', required: true },
  },
  { minimize: false, timestamps: true, collection: 'contestants' }
);
ContestantSchema.plugin(mongoosePaginate);

const Contestant = model('Contestant', ContestantSchema);

module.exports = Contestant;
