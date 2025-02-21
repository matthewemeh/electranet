const Log = require('../models/log.model');

const fetchLogs = async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    const paginatedLogs = await Log.paginate(
      {},
      { page, limit, sort: { createdAt: -1 }, populate: 'user' }
    );
    res
      .status(200)
      .json({ message: 'Logs fetched successfully', status: 'success', data: paginatedLogs });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: error.message, errors: null, httpStatusCode: 500, status: 'failed' });
  }
};

module.exports = { fetchLogs };
