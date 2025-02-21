const bcrypt = require('bcrypt');
const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const { ROLES } = require('../constants');
const Token = require('../models/token.model');
const { createToken } = require('../utils/token.utils');

const UserSchema = new Schema(
  {
    vin: { type: String, required: true, trim: true, unique: true, immutable: true },
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
    profileImageUrl: { type: String, default: '' },
    address: { type: String, trim: true, maxLength: 256, default: '' },
    electionsVoted: [{ type: Schema.Types.ObjectId, ref: 'Election' }],
    gender: { type: String, trim: true, required: true, maxLength: 10 },
    occupation: { type: String, trim: true, maxLength: 64, default: '' },
    dateOfBirth: { type: String, trim: true, maxLength: 20, default: '' },
    otherNames: [{ type: String, trim: true, minLength: 2, maxLength: 64 }],
    password: { type: String, trim: true, required: [true, 'is required'] },
    role: { type: String, enum: [ROLES.USER], default: ROLES.USER, immutable: true },
    emailVerified: { type: Boolean, default: false, immutable: doc => doc.emailVerified },
    delimitationCode: { type: String, trim: true, maxLength: 20, required: true, immutable: true },
    email: {
      type: String,
      trim: true,
      index: true,
      unique: true,
      immutable: true,
      required: [true, 'is required'],
      validate: {
        validator: str => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(str),
        message: props => `${props.value} is not a valid email`,
      },
    },
  },
  { minimize: false, versionKey: false, collection: 'users' }
);
UserSchema.plugin(mongoosePaginate);

/* Before returning json response to client after a successful login, add a token field */
UserSchema.statics.findByCredentials = async (email, password) => {
  try {
    const user = await User.findOne({ email });

    if (!user) throw new Error('User not found');

    const passwordMatches = bcrypt.compareSync(password, user.password);
    if (passwordMatches) {
      const tokenData = { email, userID: user._id };
      const tokens = {
        accessToken: createToken(tokenData),
        refreshToken: createToken(tokenData, process.env.REFRESH_TOKEN_SECRET),
      };

      await Token.create(tokens);
      user.tokens = tokens;
      return user;
    }
    throw new Error('Invalid credentials');
  } catch (error) {
    throw new Error(error.message);
  }
};

/* Before returning json response to client, remove the password field */
UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

/* before saving user details, hash the password */
UserSchema.pre('save', function (next) {
  const user = this;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(30, (error, salt) => {
    if (error) return next(error);

    bcrypt.hash(user.password, salt, (error, hash) => {
      if (error) return next(error);

      user.password = hash;
      next();
    });
  });
});

const User = model('User', UserSchema);

module.exports = User;
