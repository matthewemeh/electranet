const { Schema, model, Types } = require('mongoose');

const { ROLES } = require('../constants');

const subDocOptions = { minimize: false, _id: false, id: false };

const EmailSchema = new Schema(
  {
    value: { type: String, required: true, immutable: doc => doc.verified },
    verified: { type: Boolean, default: false, immutable: doc => doc.verified },
  },
  subDocOptions
);

const UserSchema = new Schema(
  {
    vin: { type: String, immutable: true },
    faceID: { type: Boolean, default: false },
    email: { type: EmailSchema, required: true },
    middleName: { type: String, immutable: true },
    dateOfBirth: { type: String, immutable: true },
    delimitationCode: { type: String, immutable: true },
    password: { type: String, trim: true, required: true },
    address: { type: String, trim: true, immutable: true },
    occupation: { type: String, trim: true, immutable: true },
    lastName: { type: String, immutable: true, required: true },
    electionsVoted: [{ type: Types.ObjectId, ref: 'Election' }],
    firstName: { type: String, immutable: true, required: true },
    gender: { type: String, immutable: true, enum: ['MALE', 'FEMALE'] },
    role: { type: String, immutable: true, enum: Object.values(ROLES), required: true },
  },
  { minimize: false, timestamps: true, collection: 'users' }
);

UserSchema.index({ 'email.value': 1 }, { unique: true });
UserSchema.index({ firstName: 'text', lastName: 'text' });
UserSchema.index(
  { vin: 1 },
  { unique: true, partialFilterExpression: { vin: { $exists: true, $gt: '' } } }
);

/**
 * This function get all possible permutations from a user's delimitation code
 * E.g "12-34-56-78" => ["12-34-56-78", "12-34-56", "12-34", "12-34", "12", ""]
 * @returns {string[]}
 */
UserSchema.methods.getDelimitations = function () {
  const delimitationCodeArr = this.delimitationCode.split('-');
  const delimitations = [];

  for (let i = delimitationCodeArr.length; i >= 0; i--) {
    delimitations.push(delimitationCodeArr.slice(0, i).join('-'));
  }
  return delimitations;
};

// Before returning json response to client, remove sensitive field(s)
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.vin;
  delete user.password;
  delete user.electionsVoted;
  return user;
};

const User = model('User', UserSchema);
module.exports = User;
