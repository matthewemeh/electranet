const Log = require('../models/log.model');
const { asyncHandler } = require('../middlewares/error.middlewares');

const fetchLogs = async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const paginatedLogs = await Log.paginate(
    {},
    { page, limit, sort: { createdAt: -1 }, populate: 'user' }
  );
  res
    .status(200)
    .json({ message: 'Logs fetched successfully', status: 'success', data: paginatedLogs });
};

module.exports = { fetchLogs: asyncHandler(fetchLogs) };
