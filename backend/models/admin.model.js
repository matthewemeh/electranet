const bcrypt = require('bcrypt');
const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { ROLES } = require('../constants');
const Token = require('../models/token.model');
const { hashData } = require('../utils/hash.utils');
const { createToken } = require('../utils/token.utils');

const AdminSchema = new Schema(
  {
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
    profileImageUrl: { type: String, default: '' },
    password: { type: String, trim: true, required: [true, 'is required'] },
    otherNames: [{ type: String, trim: true, minLength: 2, maxLength: 64 }],
    emailVerified: { type: Boolean, default: false, immutable: doc => doc.emailVerified },
    role: {
      type: String,
      immutable: true,
      uppercase: true,
      default: ROLES.ADMIN,
      enum: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
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
  { minimize: false, timestamps: true, collection: 'admins' }
);
AdminSchema.plugin(mongoosePaginate);

/* Before returning json response to client after a successful login, add a token field */
AdminSchema.statics.findByCredentials = async (email, password) => {
  try {
    const admin = await Admin.findOne({ email });

    if (!admin) throw new Error('Admin not found');

    const passwordMatches = bcrypt.compareSync(password, admin.password);
    if (passwordMatches) {
      const tokenData = { issuedAt: Date.now(), email, _id: admin._id };
      let tokens = {
        accessToken: createToken(tokenData),
        refreshToken: createToken(
          tokenData,
          process.env.REFRESH_TOKEN_SECRET,
          process.env.REFRESH_TOKEN_EXPIRY
        ),
      };

      // store unhashed tokens for admin
      const adminObject = admin.toJSON();
      adminObject.tokens = { ...tokens };

      // then hash the tokens
      tokens.accessToken = await hashData(tokens.accessToken);
      tokens.refreshToken = await hashData(tokens.refreshToken);

      // delete any previous tokens
      await Token.deleteOne({ email });

      // upload hashed tokens to database
      tokens.email = email;
      await Token.create(tokens);
      return adminObject;
    }
    throw new Error('Invalid credentials');
  } catch (error) {
    throw new Error(error.message);
  }
};

/* Before returning json response to client, remove the password field */
AdminSchema.methods.toJSON = function () {
  const admin = this;
  const adminObject = admin.toObject();
  delete adminObject.password;
  return adminObject;
};

/* before saving admin details, hash the password */
AdminSchema.pre('save', function (next) {
  const admin = this;

  if (!admin.isModified('password')) return next();

  bcrypt.genSalt(10, (error, salt) => {
    if (error) return next(error);

    bcrypt.hash(admin.password, salt, (error, hash) => {
      if (error) return next(error);

      admin.password = hash;
      next();
    });
  });
});

const Admin = model('Admin', AdminSchema);

module.exports = Admin;
