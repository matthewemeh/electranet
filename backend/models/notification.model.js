const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const NotificationSchema = new Schema(
  {
    role: { type: String, required: true, immutable: true },
    user: { type: Schema.Types.ObjectId, immutable: true, ref: 'User' },
    admin: { type: Schema.Types.ObjectId, immutable: true, ref: 'Admin' },
    message: { type: String, required: true, trim: true, immutable: true },
  },
  { minimize: false, timestamps: true, collection: 'notifications' }
);
NotificationSchema.plugin(mongoosePaginate);

const Notification = model('NotificationSchema', NotificationSchema);

module.exports = Notification;
