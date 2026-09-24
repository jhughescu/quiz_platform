const Joi = require("joi");

const deploymentSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),

  questionBankId: Joi.string().hex().length(24).required(),

  template: Joi.object({
    id: Joi.string().trim().min(1).default("default"),
    version: Joi.string().trim().min(1).default("1.0"),
  }).default({
    id: "default",
    version: "1.0",
  }),
});

module.exports = {
  deploymentSchema,
};
