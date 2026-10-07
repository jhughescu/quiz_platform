const Joi = require('joi');
const answerValue = Joi.alternatives().try(
  Joi.number().integer().min(0),
  Joi.boolean(),
  Joi.string().trim().allow(''),
  Joi.array().items(Joi.string().trim().min(1)).min(1)
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
const createSubmissionSchema = Joi.object({
  deploymentId: Joi.string().required(),
  questionId: Joi.string().required(),
  answer: answerValue.required()
});
const updateSubmissionSchema = Joi.object({
  questionId: Joi.string().required(),
  answer: answerValue.required()
});
module.exports = {
  submitAnswersSchema,
  createSubmissionSchema,
  updateSubmissionSchema
};