const Joi = require('joi');

const validateGetLogs = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    limit: Joi.string().equal('10', '25', '50'),
    page: Joi.string()
      .pattern(/^\d+$/)
      .messages({ 'string.pattern.base': '"page" must be a valid integer' }),
  });

  return schema.validate(data);
};

const validateGetNotifications = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    limit: Joi.string().equal('10', '25', '50'),
    page: Joi.string()
      .pattern(/^\d+$/)
      .messages({ 'string.pattern.base': '"page" must be a valid integer' }),
  });

  return schema.validate(data);
};

module.exports = { validateGetLogs, validateGetNotifications };
