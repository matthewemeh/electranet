const { Schema, model } = require('mongoose');

const { ADMIN_TOKEN_STATUS_CODES } = require('../constants');

const StatusSchema = new Schema(
  {
    statusStart: { type: Date, default: Date.now() },
    statusCode: {
      type: String,
      default: ADMIN_TOKEN_STATUS_CODES.ACTIVE,
      enum: Object.values(ADMIN_TOKEN_STATUS_CODES),
    },
  },
  { minimize: false, versionKey: false, timestamps: false }
);

// These tokens are for managing admin rights
const AdminTokenSchema = new Schema(
  {
    status: { type: StatusSchema },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now(), immutable: true },
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
  { minimize: false, timestamps: false, versionKey: false, collection: 'adminTokens' }
);

const AdminToken = model('AdminToken', AdminTokenSchema);

module.exports = AdminToken;
