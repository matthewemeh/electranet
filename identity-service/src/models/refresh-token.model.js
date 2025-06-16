const { Schema, model, Types } = require('mongoose');

const { encrypt } = require('../utils/encrypt.utils');

const RefreshTokenSchema = new Schema(
  {
    expiresAt: { type: Date, required: true },
    token: { type: String, unique: true, required: true },
    user: { type: Types.ObjectId, ref: 'User', required: true },
  },
  { minimize: false, timestamps: true, collection: 'refreshTokens' }
);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

RefreshTokenSchema.pre('save', async function (next) {
  // encrypt the token before saving to DB
  if (this.isModified('token')) {
    try {
      this.token = encrypt(this.token);
    } catch (error) {
      return next(error);
    }
  }
});

const RefreshToken = model('RefreshToken', RefreshTokenSchema);
module.exports = RefreshToken;
