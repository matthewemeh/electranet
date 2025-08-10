const Joi = require('joi');

const validateElection = data => {
  const schema = Joi.object({
    endTime: Joi.date().required(),
    startTime: Joi.date().required(),
    name: Joi.string().trim().min(2).max(256).required(),
    delimitationCode: Joi.string().trim().max(20).allow(''),
  });

  return schema.validate(data);
};

const validateElectionUpdate = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    name: Joi.string().trim().min(2).max(256),
    delimitationCode: Joi.string().trim().max(20).allow(''),
  })
    .min(1)
    .messages({
      'object.min': 'At least {{#limit}} field must be provided.',
    });

  return schema.validate(data);
};

const validateElectionContestant = data => {
  const schema = Joi.object({
    contestantID: Joi.string()
      .pattern(/^[a-f0-9]{24}$/)
      .messages({ 'string.pattern.base': '"contestantID" must be a valid ID' })
      .required(),
  });

  return schema.validate(data);
};

const validateContestant = data => {
  const schema = Joi.object({
    stateOfOrigin: Joi.string().trim().max(30).required(),
    gender: Joi.string().equal('MALE', 'FEMALE').required(),
    lastName: Joi.string().trim().min(2).max(64).required(),
    firstName: Joi.string().trim().min(2).max(64).required(),
    middleName: Joi.string().trim().min(2).max(64).allow(''),
    party: Joi.string()
      .pattern(/^[a-f0-9]{24}$/)
      .messages({ 'string.pattern.base': '"party" must be a valid ID' }),
  });

  return schema.validate(data);
};

const validateContestantUpdate = data => {
  const schema = Joi.object({
    isDeleted: Joi.boolean().strict(),
    stateOfOrigin: Joi.string().trim().max(30),
    gender: Joi.string().equal('MALE', 'FEMALE'),
    lastName: Joi.string().trim().min(2).max(64),
    firstName: Joi.string().trim().min(2).max(64),
    middleName: Joi.string().trim().min(2).max(64).allow(''),
    party: Joi.string()
      .pattern(/^[a-f0-9]{24}$/)
      .messages({ 'string.pattern.base': '"party" must be a valid ID' }),
  })
    .min(1)
    .messages({
      'object.min': 'At least {{#limit}} field must be provided.',
    });

  return schema.validate(data);
};

const validateGetContestants = data => {
  const schema = Joi.object({
    lastName: Joi.string(),
    firstName: Joi.string(),
    isDeleted: Joi.boolean(),
    sortBy: Joi.string().trim(),
    gender: Joi.string().equal('MALE', 'FEMALE'),
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().equal(10, 25, 50).default(10),
    party: Joi.string()
      .pattern(/^[a-f0-9]{24}$/)
      .messages({ 'string.pattern.base': '"party" must be a valid ID' }),
  });

  return schema.validate(data);
};

const validateGetElections = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    sortBy: Joi.string().trim(),
    delimitationCode: Joi.string().allow(''),
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

const validateGetUserElections = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

const validateParty = data => {
  const schema = Joi.object({
    motto: Joi.string().max(256).allow(''),
    shortName: Joi.string().trim().max(10).uppercase().required(),
    longName: Joi.string().trim().max(128).uppercase().required(),
  });

  return schema.validate(data);
};

const validatePartyUpdate = data => {
  const schema = Joi.object({
    motto: Joi.string().max(256).allow(''),
    shortName: Joi.string().trim().max(10).uppercase(),
    longName: Joi.string().trim().max(128).uppercase(),
  })
    .min(1)
    .messages({
      'object.min': 'At least {{#limit}} field must be provided.',
    });

  return schema.validate(data);
};

const validateGetParties = data => {
  const schema = Joi.object({
    sortBy: Joi.string().trim(),
    page: Joi.number().integer().positive(),
    limit: Joi.number().integer().equal(10, 25, 50),
  });

  return schema.validate(data);
};

module.exports = {
  validateParty,
  validateElection,
  validateGetParties,
  validateContestant,
  validatePartyUpdate,
  validateGetElections,
  validateGetContestants,
  validateElectionUpdate,
  validateGetUserElections,
  validateContestantUpdate,
  validateElectionContestant,
};
