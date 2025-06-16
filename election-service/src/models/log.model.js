const { Schema, model, Types } = require('mongoose');

const LogSchema = new Schema(
  {
    message: { type: String, trim: true, immutable: true, required: true },
    action: { type: String, default: '', uppercase: true, immutable: true },
    user: { type: Types.ObjectId, immutable: false, required: true, ref: 'User' },
  },
  { minimize: false, timestamps: true, collection: 'logs' }
);

const Log = model('Log', LogSchema);
module.exports = Log;
