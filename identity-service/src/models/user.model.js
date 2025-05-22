const { hash, verify } = require('argon2');
const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { ROLES } = require('../constants');
const { encrypt } = require('../utils/encrypt.utils');

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
    electionsVoted: [{ type: Schema.Types.ObjectId, ref: 'Election' }],
    gender: { type: String, immutable: true, enum: ['MALE', 'FEMALE'] },
    role: { type: String, immutable: true, enum: Object.values(ROLES), required: true },
  },
  { minimize: false, timestamps: true, collection: 'users' }
);
UserSchema.plugin(mongoosePaginate);

UserSchema.index({ 'email.value': 1 }, { unique: true });
UserSchema.index({ firstName: 'text', lastName: 'text' });
UserSchema.index(
  { vin: 1 },
  { unique: true, partialFilterExpression: { vin: { $exists: true, $gt: '' } } }
);

UserSchema.pre('save', async function (next) {
  // hash the password before saving to DB
  if (this.isModified('password')) {
    try {
      this.password = await hash(this.password);
    } catch (error) {
      return next(error);
    }
  }

  // encrypt the vin before saving to DB
  if (this.isModified('vin')) {
    try {
      this.vin = encrypt(this.vin);
    } catch (error) {
      return next(error);
    }
  }
});

/**
 * Validates a user's login credentials
 * @param {string} candidatePassword
 * @returns {boolean}
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await verify(this.password, candidatePassword);
  } catch (error) {
    throw error;
  }
};

// Before returning json response to client, remove sensitive field(s)
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.vin;
  delete user.password;
  delete user.electionsVoted;
  return user;
};

// prevents fields from being stripped
UserSchema.methods.toRaw = function () {
  return this.toObject({ transform: false });
};

const User = model('User', UserSchema);
module.exports = User;
