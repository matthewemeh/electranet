const { Schema, model, Types } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
  {
    id: false,
    minimize: false,
    timestamps: true,
    collection: 'adminTokens',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
AdminTokenSchema.plugin(mongoosePaginate);

AdminTokenSchema.virtual('hasExpired').get(function () {
  return this.expiresAt <= Date.now();
});

AdminTokenSchema.virtual('isActive').get(function () {
  return this.statusCode === ADMIN_TOKEN_STATUSES.ACTIVE;
});

const AdminToken = model('AdminToken', AdminTokenSchema);
module.exports = AdminToken;
