const Joi = require('joi');

const validateGetLogs = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

const validateGetNotifications = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

module.exports = { validateGetLogs, validateGetNotifications };
