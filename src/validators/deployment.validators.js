const Joi = require("joi");
const templates = require("../config/templates");
const presentations = require("../config/presentations");
const deploymentSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  questionBankId: Joi.string().hex().length(24).required(),
  template: Joi.object({
    id: Joi.string()
      .trim()
      .valid(...Object.keys(templates))
      .default("default"),
    version: Joi.string()
      .trim()
      .custom((value, helpers) => {
        const templateId = helpers.state.ancestors[0].id;
        if (templates[templateId]?.version !== value) {
          return helpers.error("any.invalid");
        }
        return value;
      })
      .default("1.0"),
  }).default({
    id: "default",
    version: "1.0",
  }),
  presentation: Joi.object({
    id: Joi.string()
      .trim()
      .valid(...Object.keys(presentations))
      .default("default"),
    version: Joi.string()
      .trim()
      .custom((value, helpers) => {
        const presentationId = helpers.state.ancestors[0].id;
        if (presentations[presentationId]?.version !== value) {
          return helpers.error("any.invalid");
        }
        return value;
      })
      .default("1.0"),
  }).default({
    id: "default",
    version: "1.0",
  }),
  randomiseOptions: Joi.boolean().default(false),
  randomiseQuestions: Joi.boolean().default(false),
});

module.exports = {
  deploymentSchema,
};
