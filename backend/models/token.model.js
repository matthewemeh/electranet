const { Schema, model } = require('mongoose');

// These tokens are for session management
const TokenSchema = new Schema(
  {
    accessToken: { type: String, required: true, trim: true },
    refreshToken: { type: String, required: true, trim: true, immutable: true },
  },
  { minimize: false, versionKey: false, collection: 'tokens' }
);

const Token = model('Token', TokenSchema);

module.exports = Token;
