const { sendEmail } = require('./email.utils');
const Notification = require('../models/notification.model');

/**
 * @param {{message: string, user: object, notifyEmail?: boolean, subject: string}}
 */
const sendNotification = async ({ message, user, notifyEmail, subject }) => {
  await Notification.create({ message, user: user._id });

  if (notifyEmail) {
    await sendEmail(user.email.value, subject, message);
  }
};

module.exports = { sendNotification };
