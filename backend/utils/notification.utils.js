const { ROLES } = require('../constants');
const User = require('../models/user.model');
const Admin = require('../models/admin.model');
const { sendEmail } = require('./email.utils');
const Notification = require('../models/notification.model');
const { APIError } = require('../middlewares/error.middlewares');

/**
 *
 * @param {string} message notification message to be sent to user
 * @param {string} role the user role - USER, ADMIN or SUPER_ADMIN
 * @param {string} id the user/admin id
 * @param {boolean?} notifyEmail an optional field that indicates if user should also be sent an email notification
 * @param {string?} subject an optional email subject field used if notifyEmail is true
 */
const sendNotification = async ({ message, role, id, notifyEmail, subject }) => {
  if (role === ROLES.USER) {
    // for users
    const user = await User.findById(id);
    if (!user) {
      throw new APIError('User not found!');
    }

    await Notification.create({ message, role, user: id });

    if (notifyEmail) {
      await sendEmail({ subject, email: user.email, text: message });
    }
  } else {
    // for admins and super-admins
    const admin = await Admin.findById(id);
    if (!admin) {
      throw new APIError('Admin not found!', 404);
    }

    await Notification.create({ message, role, admin: id });

    if (notifyEmail) {
      await sendEmail({ subject, email: admin.email, text: message });
    }
  }
};

module.exports = { sendNotification };
