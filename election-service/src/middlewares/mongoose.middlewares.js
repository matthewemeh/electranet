const express = require('express');
const { isValidObjectId } = require('mongoose');
const { StatusCodes } = require('http-status-codes');

const { logger } = require('../utils/logger.utils');
const { APIError } = require('./error.middlewares');

/**
 * Checks if the id in the request parameters is a valid Mongoose Object ID
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const isValidID = (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    logger.error('Invalid ID');
    throw new APIError('Invalid ID', StatusCodes.BAD_REQUEST);
  }

  next();
};

module.exports = { isValidID };
