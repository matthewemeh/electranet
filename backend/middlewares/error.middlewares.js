class APIError extends Error {
  constructor(message, httpStatusCode) {
    super(message);
    this.errors = null;
    this.name = 'APIError';
    this.message = message;
    this.httpStatusCode = httpStatusCode;
  }
}

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const globalErrorHandler = (error, req, res, next) => {
  console.error(error.stack);

  if (error instanceof APIError) {
    return res.status(error.httpStatusCode).json({
      errors: null,
      status: 'failed',
      message: error.message,
      httpStatusCode: error.httpStatusCode,
    });
  } else if (error.name === 'ValidationError') {
    const errorResponse = {
      errors: {},
      status: 'failed',
      httpStatusCode: 400,
      message: error.message,
    };

    Object.entries(error.errors).forEach(([key, value]) => {
      errorResponse.errors[key] = value.message;
    });

    return res.status(400).json(errorResponse);
  } else if (error.name === 'MongoServerError') {
    const errorResponse = {
      errors: null,
      status: 'failed',
      httpStatusCode: 400,
      message: error.message,
    };
    if (error.code === 11000) {
      const [field, value] = Object.entries(error.errorResponse.keyValue)[0];
      errorResponse.message = `The ${field}: ${value} is already registered on the platform`;
      errorResponse.httpStatusCode = 409;
    }

    return res.status(errorResponse.httpStatusCode).json(errorResponse);
  } else {
    return res
      .status(500)
      .json({ errors: null, status: 'failed', httpStatusCode: 500, message: error.message });
  }
};

module.exports = { APIError, asyncHandler, globalErrorHandler };
