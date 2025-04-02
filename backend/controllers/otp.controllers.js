const OTP = require('../models/otp.model');
const { hashData } = require('../utils/hash.utils');
const { generateOTP } = require('../utils/otp.utils');
const { sendEmail } = require('../utils/email.utils');
const { APIError, asyncHandler } = require('../middlewares/error.middlewares');

const resendOTP = async (req, res) => {
  // the request body is expected to contain: email and optionally duration and subject
  const { email, duration = 5 } = req.body;

  if (!email) {
    throw new APIError("Provide value for 'email'", 400);
  }

  // clear any old record
  const otpRecord = await OTP.findOne({ email });
  if (otpRecord) {
    await OTP.deleteOne({ email });
  } else {
    // user/admin has never gotten an OTP before!
    throw new APIError('No OTP record found', 400);
  }

  const generatedOTP = await generateOTP();

  req.body.html = `<p>Hello from Electranet! To complete your ongoing authentication process, please enter the OTP below.</p>
    <strong style="font-size:25px;letter-spacing:2px">${generatedOTP}</strong>
    <p>This code expires in ${duration} minute(s).</p>
    <p>If you did not initiate the process that sent this email, please disregard this email. Your privacy is important to us.</p>
    <p>Best regards,<span style="display:block;">Electranet.</span></p>
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
  await sendEmail(req.body);

  res.status(200).json({ message: 'OTP sent successfully', status: 'success', data: null });
};

module.exports = { resendOTP: asyncHandler(resendOTP) };
