const Joi = require('joi');

const validateCastVote = data => {
  const schema = Joi.object({
    voteToken: Joi.string().required(),
    partyID: Joi.string()
      .pattern(/^[a-f0-9]{24}$/)
      .messages({ 'string.pattern.base': '"partyID" must be a valid ID' })
      .required(),
    electionID: Joi.string()
      .pattern(/^[a-f0-9]{24}$/)
      .messages({ 'string.pattern.base': '"electionID" must be a valid ID' })
      .required(),
  });

  return schema.validate(data);
};

const validateVerifyUserVote = data => {
  const schema = Joi.object({
    voteID: Joi.string()
      .pattern(/^[a-f0-9]{24}$/)
      .messages({ 'string.pattern.base': '"voteID" must be a valid ID' })
      .required(),
  });

  return schema.validate(data);
};

const validateGetVotes = data => {
  const schema = Joi.object({
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

module.exports = {
  validateCastVote,
  validateGetVotes,
  validateVerifyUserVote,
};
