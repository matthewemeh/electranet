const { Schema, model, Types } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const NotificationSchema = new Schema(
  {
    user: { type: Types.ObjectId, immutable: true, ref: 'User' },
    message: { type: String, trim: true, immutable: true, required: true },
  },
  { minimize: false, timestamps: true, collection: 'notifications' }
);
NotificationSchema.plugin(mongoosePaginate);

const Notification = model('NotificationSchema', NotificationSchema);

module.exports = Notification;
