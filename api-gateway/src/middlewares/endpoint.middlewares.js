const express = require('express');
const { StatusCodes } = require('http-status-codes');

const { ROUTES } = require('../constants');
const { logger } = require('../utils/logger.utils');

/**
 * Middleware to handle 404 Not Found for undefined routes
 * @param {express.Request} req
 * @param {express.Response} res
 */
const notFound = (req, res) => {
  logger.warn('Resource not found');
  res.status(StatusCodes.NOT_FOUND).json('Resource not found');
};

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const methodChecker = (req, res, next) => {
  const { originalUrl, path: reqPath } = req;
  const reqMethod = req.method.toUpperCase();

  // check from both ends of the ROUTES array for optimum performance
  for (let i = 0, j = ROUTES.length - 1; i < j; i++, j--) {
    if (ROUTES[i].regex.test(reqPath)) {
      if (!ROUTES[i].methods.includes(reqMethod)) {
        logger.warn(`Cannot ${reqMethod} ${originalUrl}`);
        return res
          .status(StatusCodes.METHOD_NOT_ALLOWED)
          .json(`Cannot ${reqMethod} ${originalUrl}`);
      }
      break;
    }

    if (ROUTES[j].regex.test(reqPath)) {
      if (!ROUTES[j].methods.includes(reqMethod)) {
        logger.warn(`Cannot ${reqMethod} ${originalUrl}`);
        return res
          .status(StatusCodes.METHOD_NOT_ALLOWED)
          .json(`Cannot ${reqMethod} ${originalUrl}`);
      }
      break;
    }
  }

  next();
};

module.exports = { notFound, methodChecker };
