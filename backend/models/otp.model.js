const { Schema, model } = require('mongoose');

const OTPSchema = new Schema(
  {
    otp: { type: String, required: true, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true },
    createdAt: { type: Date, required: true, immutable: true },
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
  { minimize: false, collection: 'otps' }
);

const OTP = model('OTP', OTPSchema);

module.exports = OTP;
