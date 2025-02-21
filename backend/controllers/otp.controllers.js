const OTP = require('../models/otp.model');
const { hashData } = require('../utils/hash.utils');
const { generateOTP } = require('../utils/otp.utils');
const { sendEmail } = require('../utils/email.utils');

const resendOTP = async (req, res) => {
  try {
    // the request body is expected to contain: email and optionally duration and subject
    const { email, duration = 5 } = req.body;

    if (!email) {
      throw new Error("Provide value for 'email'");
    }

    // clear any old record
    await OTP.deleteOne({ email });

    const generatedOTP = await generateOTP();

    req.body.html = `<p>Hello from Electranet! To complete your ongoing authentication process, please enter the OTP below.</p>
    <strong style="font-size:25px;letter-spacing:2px">${generatedOTP}</strong>
    <p>This code expires in ${duration} minute(s).</p>
    <p>If you did not initiate the process that sent this email, please disregard this email. Your privacy is important to us.</p>
    <p>Best regards,<span style="display:block;">Nest Mate.</span><span>Your #1 Hostel Management Platform.</span></p>
    `;

    // send email
    await sendEmail(req.body);

    // save otp record
    const hashedOTP = await hashData(generatedOTP);
    await OTP.create({ email, otp: hashedOTP, expiresAt: Date.now() + 60_000 * +duration });

    res.status(200).json({ message: 'OTP sent successfully', status: 'success', data: null });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ message: error.message, status: 'failed', errors: null, httpStatusCode: 400 });
  }
};

module.exports = { resendOTP };
