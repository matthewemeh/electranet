const urlVersioning = version => (req, res, next) => {
  if (req.path.startsWith(`/api/${version}`)) {
    next();
  } else {
    res.status(404).json({
      errors: null,
      status: 'failed',
      httpStatusCode: 404,
      message: 'API version is not supported',
    });
  }
};

module.exports = { urlVersioning };
