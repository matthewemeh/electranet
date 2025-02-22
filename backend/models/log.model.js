const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const LogSchema = new Schema(
  {
    message: { type: String, required: true, trim: true, immutable: true },
    user: { type: Schema.Types.ObjectId, immutable: false, required: true, ref: 'User' },
  },
  { minimize: false, timestamps: true, collection: 'logs' }
);
LogSchema.plugin(mongoosePaginate);

const Log = model('Log', LogSchema);

module.exports = Log;
