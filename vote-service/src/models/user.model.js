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
    firstName: { type: String, immutable: true, required: true },
    electionsVoted: [{ type: Types.ObjectId, ref: 'Election' }],
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

UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Checks if a user has already voted
 * @param {string} electionID
 * @returns {boolean}
 */
UserSchema.methods.hasVoted = function (electionID) {
  const electionsVoted = new Set(this.electionsVoted.map(String));
  return electionsVoted.has(electionID);
};

/**
 * Checks if a user is eligible to vote for an election
 * @param {string} delimitationCode - the delimitation code of the election
 * @returns {boolean}
 */
UserSchema.methods.canVote = function (delimitationCode) {
  return this.delimitationCode.startsWith(delimitationCode);
};

// prevents fields from being stripped
UserSchema.methods.toRaw = function () {
  return this.toObject({ transform: false });
};

const User = model('User', UserSchema);
module.exports = User;
