const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.AUTH_TRANSPORT_USERNAME,
    pass: process.env.AUTH_TRANSPORT_PASSWORD
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log('Ready for messages: ', success);
  }
});

module.exports = { transporter };
