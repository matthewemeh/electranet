const { StatusCodes } = require('http-status-codes');

const { logger } = require('./logger.utils');
const { transporter } = require('../config/email.config');
const { APIError } = require('../middlewares/error.middlewares');

/**
 * Function to send an email using the configured transporter
 * to handle errors properly.
 * @param {string} email user email to be addressed
 * @param {string} subject subject of email
 * @param {string?} text optional email text or content field
 * @param {string?} html optional html email content field
 */
const sendEmail = async (email, subject, text, html) => {
  if (!email) {
    throw new APIError('Could not find "email" field', StatusCodes.BAD_REQUEST);
  }

  const mailOptions = { subject, to: email, from: process.env.AUTH_TRANSPORT_USERNAME };

  if (text) {
    mailOptions.text = text;
  } else if (html) {
    mailOptions.html = html;
  } else {
    throw new APIError('Could not find "text" or "html" field', StatusCodes.BAD_REQUEST);
  }

  try {
    // Await the transporter using a Promise wrapper
    await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      });
    });
  } catch (err) {
    logger.error('Failed to send email');
    throw new APIError(
      `Failed to send email: ${err.message}`,
      StatusCodes.INTERNAL_SERVER_ERROR,
      err
    );
  }
};

module.exports = { sendEmail };
