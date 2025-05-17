const { Schema, model } = require('mongoose');

const { ADMIN_TOKEN_STATUSES } = require('../constants');

// These tokens are for managing admin rights
const AdminTokenSchema = new Schema(
  {
    expiresAt: { type: Date },
    user: { type: Schema.Types.ObjectId, unique: true, required: true },
    statusCode: {
      type: String,
      uppercase: true,
      default: ADMIN_TOKEN_STATUSES.ACTIVE,
      enum: Object.values(ADMIN_TOKEN_STATUSES),
    },
  },
  { minimize: false, timestamps: true, collection: 'adminTokens' }
);

const AdminToken = model('AdminToken', AdminTokenSchema);
module.exports = AdminToken;
