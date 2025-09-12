const { Schema, model, Types } = require('mongoose');

const ContestantSchema = new Schema(
  {
    middleName: { type: String },
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    party: { type: Types.ObjectId, ref: 'Party' },
    stateOfOrigin: { type: String, required: true },
    profileImageUrl: { type: String, required: true },
    gender: { type: String, required: true, uppercase: true, enum: ['MALE', 'FEMALE'] },
  },
  { minimize: false, timestamps: true, collection: 'contestants' }
);

const Contestant = model('Contestant', ContestantSchema);
module.exports = Contestant;
