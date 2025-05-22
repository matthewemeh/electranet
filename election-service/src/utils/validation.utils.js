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
  }).required();

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
    profileImageUrl: Joi.string().required(),
    middleName: Joi.string().trim().min(2).max(64),
    stateOfOrigin: Joi.string().trim().max(20).required(),
    gender: Joi.string().equal('MALE', 'FEMALE').required(),
    lastName: Joi.string().trim().min(2).max(64).required(),
    firstName: Joi.string().trim().min(2).max(64).required(),
  });

  return schema.validate(data);
};

const validateContestantUpdate = data => {
  const schema = Joi.object({
    party: Joi.string(),
    profileImageUrl: Joi.string(),
    isDeleted: Joi.equal(true, false),
    stateOfOrigin: Joi.string().trim().max(20),
    gender: Joi.string().equal('MALE', 'FEMALE'),
    lastName: Joi.string().trim().min(2).max(64),
    firstName: Joi.string().trim().min(2).max(64),
    middleName: Joi.string().trim().min(2).max(64),
  }).required();

  return schema.validate(data);
};

const validateGetElections = data => {
  const schema = Joi.object({
    endTime: Joi.date(),
    startTime: Joi.date(),
    delimitationCode: Joi.string(),
    limit: Joi.string().equal('10', '25', '50'),
    page: Joi.string()
      .pattern(/^\d+$/)
      .messages({ 'string.pattern.base': '"page" must be a valid integer' }),
  });

  return schema.validate(data);
};

const validateGetUserElections = data => {
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

const validateParty = data => {
  const schema = Joi.object({
    motto: Joi.string().max(256),
    logoUrl: Joi.string().required(),
    shortName: Joi.string().trim().max(10).uppercase().required(),
    longName: Joi.string().trim().max(128).uppercase().required(),
  });

  return schema.validate(data);
};

const validatePartyUpdate = data => {
  const schema = Joi.object({
    logoUrl: Joi.string(),
    motto: Joi.string().max(256),
    shortName: Joi.string().trim().max(10).uppercase(),
    longName: Joi.string().trim().max(128).uppercase(),
  }).required();

  return schema.validate(data);
};

const validateGetParties = data => {
  const schema = Joi.object({
    limit: Joi.string().equal('10', '25', '50'),
    page: Joi.string()
      .pattern(/^\d+$/)
      .messages({ 'string.pattern.base': '"page" must be a valid integer' }),
  }).required();

  return schema.validate(data);
};

module.exports = {
  validateParty,
  validateElection,
  validateGetParties,
  validateContestant,
  validatePartyUpdate,
  validateGetElections,
  validateElectionUpdate,
  validateGetUserElections,
  validateContestantUpdate,
  validateElectionContestant,
};
