const { Schema, model } = require('mongoose');

const NotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, immutable: true, ref: 'User' },
    message: { type: String, trim: true, immutable: true, required: true },
  },
  { minimize: false, timestamps: true, collection: 'notifications' }
);

const Notification = model('NotificationSchema', NotificationSchema);

module.exports = Notification;
