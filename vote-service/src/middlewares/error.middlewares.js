const express = require('express');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');

class APIError extends Error {
  /**
   * @param {string} message
   * @param {number} httpStatusCode
   * @param {object?} errors
   * @param {string?} errorCode
   */
  constructor(message, httpStatusCode, errors, errorCode) {
    super(message);
    this.errors = errors;
    this.name = 'APIError';
    this.message = message;
    this.errorCode = errorCode;
    this.httpStatusCode = httpStatusCode;
  }
}

/**
 * @param {any} error
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const globalErrorHandler = (error, req, res, next) => {
  if (error instanceof APIError) {
    // NB: Make sure to log errors/warnings (using logger) wherever you throw an APIError outside this file
    // For all other error types, the logger logs the error from here
    return res.status(error.httpStatusCode).json({
      success: false,
      errors: error.errors,
      message: error.message,
      errorCode: error.errorCode,
    });
  } else if (error.name === 'ValidationError') {
    const errorResponse = { errors: {}, success: false, message: error.message };

    Object.entries(error.errors).forEach(([key, value], index) => {
      errorResponse.errors[key] = value.message;
      if (index === 0) errorResponse.message = value.message;
    });

    logger.error('ValidationError', { message: errorResponse.message });
    return res.status(StatusCodes.BAD_REQUEST).json(errorResponse);
  } else if (error.name === 'MongoServerError') {
    const errorResponse = { errors: null, success: false, message: error.message };
    if (error.code === 11000) {
      const [field, value] = Object.entries(error.errorResponse.keyValue)[0];
      errorResponse.message =
        error.customMessage ||
        `The ${field.split('.')[0]}: ${value} is already registered on the platform`;
      return res.status(StatusCodes.CONFLICT).json(errorResponse);
    }

    logger.error('MongoServerError', { message: errorResponse.message });
    return res.status(StatusCodes.BAD_REQUEST).json(errorResponse);
  } else {
    logger.error(error.stack);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ errors: null, success: false, message: error.message });
  }
};

module.exports = { APIError, globalErrorHandler };
