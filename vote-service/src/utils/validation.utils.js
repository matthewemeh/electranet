const Joi = require('joi');

const validateCastVote = data => {
  const schema = Joi.object({
    partyID: Joi.string().required(),
    electionID: Joi.string().required(),
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
    page: Joi.number().min(1).default(1),
    limit: Joi.number().equal(10, 25, 50).default(10),
  });

  return schema.validate(data);
};

module.exports = {
  validateCastVote,
  validateGetVotes,
  validateVerifyUserVote,
};
