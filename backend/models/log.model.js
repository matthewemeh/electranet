const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const LogSchema = new Schema(
  {
    message: { type: String, required: true, trim: true, immutable: true },
    action: { type: String, default: '', trim: true, uppercase: true, immutable: true },
    admin: { type: Schema.Types.ObjectId, immutable: false, required: true, ref: 'Admin' },
  },
  { minimize: false, timestamps: true, collection: 'logs' }
);
LogSchema.plugin(mongoosePaginate);

const Log = model('Log', LogSchema);

module.exports = Log;
