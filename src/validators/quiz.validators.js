const Joi = require('joi');

// A single answer can be: an option index, a boolean, free text, or an array of indexes
const answerValue = Joi.alternatives().try(
  Joi.number().integer().min(0),
  Joi.boolean(),
  Joi.string().trim().min(1),
  Joi.array().items(Joi.number().integer().min(0)).min(1)
);

const submitAnswersSchema = Joi.object({
    deploymentId: Joi.string().required(),

    answers: Joi.object()
        .pattern(
            Joi.string(),
            Joi.alternatives().try(
                Joi.string().trim().allow(''),
                Joi.boolean(),
                Joi.array().items(Joi.string().trim().min(1)).min(1)
            )
        )
        .min(1)
        .required()
});

module.exports = { submitAnswersSchema };
