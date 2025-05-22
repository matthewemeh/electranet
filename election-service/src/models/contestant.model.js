const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ContestantSchema = new Schema(
  {
    isDeleted: { type: Boolean },
    middleName: { type: String },
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    stateOfOrigin: { type: String, required: true },
    profileImageUrl: { type: String, required: true },
    party: { type: Schema.Types.ObjectId, ref: 'Party' },
    election: { type: Schema.Types.ObjectId, ref: 'Election' },
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
