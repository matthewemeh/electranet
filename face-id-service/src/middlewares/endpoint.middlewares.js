const express = require('express');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');

/**
 * Middleware to handle 404 Not Found for undefined routes
 * @param {express.Request} req
 * @param {express.Response} res
 */
const notFound = (req, res) => {
  logger.warn('Resource not found');
  res.status(StatusCodes.NOT_FOUND).send('Resource not found');
};

/**
 * Middleware to handle Method Not Allowed for defined routes
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const methodNotAllowed = (req, res, next) => {
  if (!req.route) {
    logger.warn(`Cannot ${req.method} ${req.originalUrl}`);
    return res
      .status(StatusCodes.METHOD_NOT_ALLOWED)
      .send(`Cannot ${req.method} ${req.originalUrl}`);
  }
  next();
};

module.exports = { notFound, methodNotAllowed };
