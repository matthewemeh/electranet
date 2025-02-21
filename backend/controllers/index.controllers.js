const Token = require('../models/token.model');

const logout = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader?.split(' ')[1];

    await Token.deleteOne({ accessToken });
    res.status(200).json({ message: 'Logout successful', status: 'success', data: null });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: error.message, status: 'failed', httpStatusCode: 500, errors: null });
  }
};

module.exports = { logout };
