const OTP = require('../models/otp.model');
const { hashData } = require('../utils/hash.utils');
const { sendEmail } = require('../utils/email.utils');
const { APIError } = require('../middlewares/error.middlewares');

const generateOTP = async () => {
  return `${Math.floor(100_000 + Math.random() * 900_000)}`;
};

/**
 *
 * @param {string} email the email to be addressed the OTP
 * @param {string?} subject the subject of the addressed email
 * @param {number?} duration the validity period of the OTP in minutes
 */
const sendOTP = async ({ email, subject, duration = 5 }) => {
  if (!email) {
    throw new APIError("Provide value for 'email'", 400);
  }

  // clear any old record
  await OTP.deleteOne({ email });

  const generatedOTP = await generateOTP();

  const html = `<p>Hello from Electranet! To complete your ongoing authentication process, please enter the OTP below.</p>
    <strong style="font-size:25px;letter-spacing:2px">${generatedOTP}</strong>
    <p>This code expires in ${duration} minute(s).</p>
    <p>If you did not initiate the process that sent this email, please disregard this email. Your privacy is important to us.</p>
    <p>Best regards,<span style="display:block">Electranet.</span></p>
    `;

  // save otp record
  const hashedOTP = await hashData(generatedOTP);
  await OTP.create({
    email,
    otp: hashedOTP,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000 * +duration,
  });

  // send email
  await sendEmail({ email, subject, html });
};

module.exports = { generateOTP, sendOTP };
