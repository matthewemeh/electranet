const { Schema, model, Types } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const LogSchema = new Schema(
  {
    message: { type: String, trim: true, immutable: true, required: true },
    action: { type: String, default: '', uppercase: true, immutable: true },
    user: { type: Types.ObjectId, immutable: false, required: true, ref: 'User' },
  },
  { minimize: false, timestamps: true, collection: 'logs' }
);
LogSchema.plugin(mongoosePaginate);

const Log = model('Log', LogSchema);
module.exports = Log;
