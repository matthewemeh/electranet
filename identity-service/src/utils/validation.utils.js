const Joi = require('joi');

const { ROLES, ADMIN_TOKEN_STATUSES } = require('../constants');

const validateRegisterUser = data => {
  const schema = Joi.object({
    vin: Joi.string().trim().required(),
    delimitationCode: Joi.string().required(),
    middleName: Joi.string().trim().min(2).max(64),
    address: Joi.string().trim().max(256).required(),
    occupation: Joi.string().trim().max(128).required(),
    lastName: Joi.string().trim().min(2).max(64).required(),
    gender: Joi.string().equal('MALE', 'FEMALE').required(),
    firstName: Joi.string().trim().min(2).max(64).required(),
    email: Joi.string()
      .lowercase()
      .trim()
      .email()
      .pattern(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)
      .required(),
    dateOfBirth: Joi.string()
      .pattern(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/)
      .required()
      .messages({ 'string.pattern.base': '"dateOfBirth" must be in this format: DD-MM-YYYY' }),
    password: Joi.string()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/)
      .required()
      .messages({
        'string.pattern.base':
          '"password" must have between 8 to 20 characters and at least 1 of each: UPPERCASE letter, lowercase letter, digit and special character',
      }),
  });

  return schema.validate(data);
};

const validateRegisterAdmin = data => {
  const schema = Joi.object({
    middleName: Joi.string().trim().min(2).max(64),
    lastName: Joi.string().trim().min(2).max(64).required(),
    firstName: Joi.string().trim().min(2).max(64).required(),
    role: Joi.string().equal(ROLES.ADMIN, ROLES.SUPER_ADMIN).required(),
    email: Joi.string()
      .lowercase()
      .trim()
      .email()
      .pattern(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)
      .required(),
    password: Joi.string()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/)
      .required()
      .messages({
        'string.pattern.base':
          '"password" must have between 8 to 20 characters and at least 1 of each: UPPERCASE letter, lowercase letter, digit and special character',
      }),
  });

  return schema.validate(data);
};

const validateSendOTP = data => {
  const schema = Joi.object({
    duration: Joi.number().strict(),
    subject: Joi.string().required(),
    email: Joi.string().email().required(),
  });

  return schema.validate(data);
};

const validateVerifyOTP = data => {
  const schema = Joi.object({
    otp: Joi.string().required(),
    email: Joi.string().email().required(),
  });

  return schema.validate(data);
};

const validateResetPassword = data => {
  const schema = Joi.object({
    resetToken: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/)
      .required()
      .messages({
        'string.pattern.base':
          '"password" must have between 8 to 20 characters and at least 1 of each: UPPERCASE letter, lowercase letter, digit and special character',
      }),
  });

  return schema.validate(data);
};

const validateForgotPasswordInitiate = data => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });

  return schema.validate(data);
};

const validateLogin = data => {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });

  return schema.validate(data);
};

const validateRefreshToken = data => {
  const schema = Joi.object({
    refreshToken: Joi.string().required(),
  });

  return schema.validate(data);
};

const validateLogout = data => {
  const schema = Joi.object({
    refreshToken: Joi.string().required(),
  });

  return schema.validate(data);
};

const validateAdminInvite = data => {
  const schema = Joi.object({
    expiresAt: Joi.date(),
    userID: Joi.string().required(),
  });

  return schema.validate(data);
};

const validateModifyToken = data => {
  const schema = Joi.object({
    expiresAt: Joi.number().strict().min(-1),
    statusCode: Joi.string().equal(...Object.values(ADMIN_TOKEN_STATUSES)),
  })
    .min(1)
    .messages({
      'object.min': 'At least {{#limit}} field must be provided.',
    });

  return schema.validate(data);
};

const validateGetUsers = data => {
  const schema = Joi.object({
    lastName: Joi.string(),
    firstName: Joi.string(),
    email: Joi.string().email(),
    delimitationCode: Joi.string(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().equal(10, 25, 50).default(10),
    role: Joi.string().equal(ROLES.ADMIN, ROLES.USER),
  });

  return schema.validate(data);
};

const validateGetAdminTokens = data => {
  const schema = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

module.exports = {
  validateLogin,
  validateLogout,
  validateSendOTP,
  validateGetUsers,
  validateVerifyOTP,
  validateModifyToken,
  validateAdminInvite,
  validateRefreshToken,
  validateRegisterUser,
  validateRegisterAdmin,
  validateResetPassword,
  validateGetAdminTokens,
  validateForgotPasswordInitiate,
};
