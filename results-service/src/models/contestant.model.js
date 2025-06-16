const { Schema, model, Types } = require('mongoose');

const ContestantSchema = new Schema(
  {
    isDeleted: { type: Boolean },
    middleName: { type: String },
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    stateOfOrigin: { type: String, required: true },
    profileImageUrl: { type: String, required: true },
    party: { type: Types.ObjectId, ref: 'Party' },
    election: { type: Types.ObjectId, ref: 'Election' },
    gender: { type: String, required: true, uppercase: true, enum: ['MALE', 'FEMALE'] },
  },
  { minimize: false, timestamps: true, collection: 'contestants' }
);

const Contestant = model('Contestant', ContestantSchema);
module.exports = Contestant;
