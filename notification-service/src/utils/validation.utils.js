const Joi = require('joi');

const validateGetLogs = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    sortBy: Joi.string().trim(),
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

const validateGetNotifications = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    sortBy: Joi.string().trim(),
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

module.exports = { validateGetLogs, validateGetNotifications };
