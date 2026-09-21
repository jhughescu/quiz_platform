const Joi = require('joi');

const deploymentSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),

  questionBankId: Joi.string()
    .hex()
    .length(24)
    .required(),

  template: Joi.object({
    id: Joi.string().trim().min(1).required(),
    version: Joi.string().trim().min(1).required()
  }).required()
});

module.exports = {
  deploymentSchema
};