const { Schema, model, Types } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
ContestantSchema.plugin(mongoosePaginate);

ContestantSchema.index({ firstName: 'text', lastName: 'text' });

ContestantSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const Contestant = model('Contestant', ContestantSchema);
module.exports = Contestant;
