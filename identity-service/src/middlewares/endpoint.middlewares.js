const express = require('express');
const listEndpoints = require('express-list-endpoints');

/**
 * @param {express.Express | express.Router} app
 */
const useEndpointCheck = app => {
  const endpoints = listEndpoints(app);

  return (req, res, next) => {
    const matched = endpoints.find(e => e.path === req.path);
    if (matched && !matched.methods.includes(req.method)) {
      return res.status(405).send('Method Not Allowed');
    }
    next();
  };
};

module.exports = { useEndpointCheck };
