const bcrypt = require('bcrypt');
const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { ROLES } = require('../constants');
const Token = require('../models/token.model');
const { hashData } = require('../utils/hash.utils');
const { createToken } = require('../utils/token.utils');

const UserSchema = new Schema(
  {
    vin: {
      type: String,
      trim: true,
      immutable: true,
      index: { unique: true },
      required: [true, 'is required'],
    },
    firstName: {
      type: String,
      trim: true,
      minLength: 2,
      maxLength: 64,
      immutable: true,
      required: [true, 'is required'],
    },
    lastName: {
      type: String,
      trim: true,
      minLength: 2,
      maxLength: 64,
      immutable: true,
      required: [true, 'is required'],
    },
    profileImageUrl: { type: String, default: '', immutable: true },
    address: { type: String, trim: true, maxLength: 256, default: '', immutable: true },
    electionsVoted: [{ type: Schema.Types.ObjectId, ref: 'Election' }],
    occupation: { type: String, trim: true, maxLength: 64, default: '', immutable: true },
    dateOfBirth: { type: String, trim: true, maxLength: 20, default: '', immutable: true },
    otherNames: [{ type: String, trim: true, minLength: 2, maxLength: 64 }],
    password: { type: String, trim: true, required: [true, 'is required'] },
    role: {
      type: String,
      uppercase: true,
      immutable: true,
      enum: [ROLES.USER],
      default: ROLES.USER,
    },
    emailVerified: { type: Boolean, default: false, immutable: doc => doc.emailVerified },
    gender: {
      type: String,
      trim: true,
      maxLength: 10,
      immutable: true,
      uppercase: true,
      enum: ['MALE', 'FEMALE'],
      required: [true, 'is required'],
    },
    delimitationCode: {
      type: String,
      trim: true,
      maxLength: 20,
      immutable: true,
      required: [true, 'is required'],
    },
    email: {
      type: String,
      trim: true,
      immutable: true,
      index: { unique: true },
      required: [true, 'is required'],
      validate: {
        validator: str => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(str),
        message: props => `${props.value} is not a valid email`,
      },
    },
  },
  { minimize: false, timestamps: true, collection: 'users' }
);
UserSchema.plugin(mongoosePaginate);

/* Before returning json response to client after a successful login, add a token field */
UserSchema.statics.findByCredentials = async (email, password) => {
  try {
    const user = await User.findOne({ email });

    if (!user) throw new Error('User not found');

    const passwordMatches = bcrypt.compareSync(password, user.password);
    if (passwordMatches) {
      const tokenData = { issuedAt: Date.now(), email, _id: user._id };
      let tokens = {
        accessToken: createToken(tokenData),
        refreshToken: createToken(
          tokenData,
          process.env.REFRESH_TOKEN_SECRET,
          process.env.REFRESH_TOKEN_EXPIRY
        ),
      };

      // store unhashed tokens for user
      const userObject = user.toJSON();
      userObject.tokens = { ...tokens };

      // then hash the tokens
      tokens.accessToken = await hashData(tokens.accessToken);
      tokens.refreshToken = await hashData(tokens.refreshToken);

      // delete any previous tokens
      await Token.deleteOne({ email });

      // upload hashed tokens to database
      tokens.email = email;
      await Token.create(tokens);
      return userObject;
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

  bcrypt.genSalt(10, (error, salt) => {
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
