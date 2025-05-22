const Joi = require('joi');

const validateCastVote = data => {
  const schema = Joi.object({
    partyID: Joi.string().required(),
    electionID: Joi.string().required(),
    contestants: Joi.array().required(),
  });

  return schema.validate(data);
};

const validateVerifyUserVote = data => {
  const schema = Joi.object({
    voteID: Joi.string().required(),
  });

  return schema.validate(data);
};

const validateGetVotes = data => {
  const schema = Joi.object({
    limit: Joi.string().equal('10', '25', '50'),
    page: Joi.string()
      .pattern(/^\d+$/)
      .messages({ 'string.pattern.base': '"page" must be a valid integer' }),
  }).required();

  return schema.validate(data);
};

module.exports = {
  validateCastVote,
  validateGetVotes,
  validateVerifyUserVote,
};
