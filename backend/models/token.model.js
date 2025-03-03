const { Schema, model } = require('mongoose');

// These tokens are for session management
const TokenSchema = new Schema(
  {
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
    accessToken: { type: String, required: true, trim: true },
    refreshToken: { type: String, required: true, trim: true, immutable: true },
  },
  { minimize: false, collection: 'tokens' }
);

const Token = model('Token', TokenSchema);

module.exports = Token;
