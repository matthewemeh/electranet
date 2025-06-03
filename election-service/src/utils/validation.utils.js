const Joi = require('joi');

const validateElection = data => {
  const schema = Joi.object({
    endTime: Joi.date().required(),
    startTime: Joi.date().required(),
    delimitationCode: Joi.string().trim().max(20),
    name: Joi.string().trim().min(2).max(256).required(),
  });

  return schema.validate(data);
};

const validateElectionUpdate = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    name: Joi.string().trim().min(2).max(256),
    delimitationCode: Joi.string().trim().max(20),
  })
    .min(1)
    .messages({
      'object.min': 'At least {{#limit}} field must be provided.',
    });

  return schema.validate(data);
};

const validateElectionContestant = data => {
  const schema = Joi.object({
    contestantID: Joi.string().required(),
  });

  return schema.validate(data);
};

const validateContestant = data => {
  const schema = Joi.object({
    party: Joi.string(),
    middleName: Joi.string().trim().min(2).max(64),
    stateOfOrigin: Joi.string().trim().max(30).required(),
    gender: Joi.string().equal('MALE', 'FEMALE').required(),
    lastName: Joi.string().trim().min(2).max(64).required(),
    firstName: Joi.string().trim().min(2).max(64).required(),
  });

  return schema.validate(data);
};

const validateContestantUpdate = data => {
  const schema = Joi.object({
    party: Joi.string(),
    isDeleted: Joi.boolean().strict(),
    stateOfOrigin: Joi.string().trim().max(30),
    gender: Joi.string().equal('MALE', 'FEMALE'),
    lastName: Joi.string().trim().min(2).max(64),
    firstName: Joi.string().trim().min(2).max(64),
    middleName: Joi.string().trim().min(2).max(64),
  })
    .min(1)
    .messages({
      'object.min': 'At least {{#limit}} field must be provided.',
    });

  return schema.validate(data);
};

const validateGetContestants = data => {
  const schema = Joi.object({
    party: Joi.string(),
    lastName: Joi.string(),
    firstName: Joi.string(),
    isDeleted: Joi.boolean(),
    page: Joi.number().min(1).default(1),
    gender: Joi.string().equal('MALE', 'FEMALE'),
    limit: Joi.number().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

const validateGetElections = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    delimitationCode: Joi.string(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

const validateGetUserElections = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

const validateParty = data => {
  const schema = Joi.object({
    motto: Joi.string().max(256),
    shortName: Joi.string().trim().max(10).uppercase().required(),
    longName: Joi.string().trim().max(128).uppercase().required(),
  });

  return schema.validate(data);
};

const validatePartyUpdate = data => {
  const schema = Joi.object({
    motto: Joi.string().max(256),
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
    page: Joi.number().min(1),
    limit: Joi.number().equal(10, 25, 50),
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
