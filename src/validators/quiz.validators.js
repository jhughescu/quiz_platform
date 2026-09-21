const Joi = require('joi');

// A single answer can be: an option index, a boolean, free text, or an array of indexes
const answerValue = Joi.alternatives().try(
  Joi.number().integer().min(0),
  Joi.boolean(),
  Joi.string().trim().min(1),
  Joi.array().items(Joi.number().integer().min(0)).min(1)
);

const submitAnswersSchema = Joi.object({
  answers: Joi.object().pattern(Joi.string(), answerValue).min(1).required()
});

module.exports = { submitAnswersSchema };
