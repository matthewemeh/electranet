const bcrypt = require('bcrypt');
const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const { ROLES } = require('../constants');
const Token = require('../models/token.model');
const { createToken } = require('../utils/token.utils');

const AdminSchema = new Schema(
  {
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
    password: { type: String, trim: true, required: [true, 'is required'] },
    otherNames: [{ type: String, trim: true, minLength: 2, maxLength: 64 }],
    emailVerified: { type: Boolean, default: false, immutable: doc => doc.emailVerified },
    role: {
      type: String,
      immutable: true,
      default: ROLES.ADMIN,
      enum: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    },
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
  { minimize: false, versionKey: false, collection: 'admins' }
);
AdminSchema.plugin(mongoosePaginate);

/* Before returning json response to client after a successful login, add a token field */
AdminSchema.statics.findByCredentials = async (email, password) => {
  try {
    const admin = await Admin.findOne({ email });

    if (!admin) throw new Error('Admin not found');

    const passwordMatches = bcrypt.compareSync(password, admin.password);
    if (passwordMatches) {
      const tokenData = { email, adminID: admin._id };
      const tokens = {
        accessToken: createToken(tokenData),
        refreshToken: createToken(tokenData, process.env.REFRESH_TOKEN_SECRET),
      };

      await Token.create(tokens);
      admin.tokens = tokens;
      return admin;
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

  bcrypt.genSalt(30, (error, salt) => {
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
