const { createTransport } = require('nodemailer');

const { logger } = require('../utils/logger.utils');

const transporter = createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.AUTH_TRANSPORT_USERNAME,
    pass: process.env.AUTH_TRANSPORT_PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    logger.error(`Failed to setup email transporter: ${error}`);
  } else {
    logger.info(`Ready for messages: ${success}`);
  }
});

module.exports = { transporter };
