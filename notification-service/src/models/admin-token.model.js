const { Schema, model, Types } = require('mongoose');

const { ADMIN_TOKEN_STATUSES } = require('../constants');

// These tokens are for managing admin rights
const AdminTokenSchema = new Schema(
  {
    expiresAt: { type: Date },
    user: { type: Types.ObjectId, ref: 'User', unique: true, required: true },
    statusCode: {
      type: String,
      uppercase: true,
      default: ADMIN_TOKEN_STATUSES.ACTIVE,
      enum: Object.values(ADMIN_TOKEN_STATUSES),
    },
  },
  { minimize: false, timestamps: true, collection: 'adminTokens' }
);

AdminTokenSchema.virtual('hasExpired').get(function () {
  return this.expiresAt <= Date.now();
});

AdminTokenSchema.virtual('isActive').get(function () {
  return this.statusCode === ADMIN_TOKEN_STATUSES.ACTIVE;
});

const AdminToken = model('AdminToken', AdminTokenSchema);
module.exports = AdminToken;
