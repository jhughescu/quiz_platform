const Joi = require('joi');

const TYPES = ['multiple-choice', 'true-false', 'multi-select', 'short-answer'];

// One schema covering all question types; fields are required/forbidden based on `type`
const questionSchema = Joi.object({
  type: Joi.string().valid(...TYPES).required(),
  question: Joi.string().trim().min(1).required(),
  questionBank: Joi.string().hex().length(24).allow(null).optional(),

  options: Joi.array()
    .items(Joi.string().trim().min(1))
    .when('type', {
      is: Joi.valid('multiple-choice', 'multi-select'),
      then: Joi.array().min(2).required(),
      otherwise: Joi.forbidden()
    }),

  correctIndex: Joi.number()
    .integer()
    .min(0)
    .when('type', { is: 'multiple-choice', then: Joi.required(), otherwise: Joi.forbidden() }),

  correctIndexes: Joi.array()
    .items(Joi.number().integer().min(0))
    .when('type', {
      is: 'multi-select',
      then: Joi.array().min(1).required(),
      otherwise: Joi.forbidden()
    }),

  correctAnswer: Joi.alternatives().conditional('type', {
    switch: [
      { is: 'true-false', then: Joi.boolean().required() },
      { is: 'short-answer', then: Joi.string().trim().min(1).required() }
    ],
    otherwise: Joi.forbidden()
  }),

  caseSensitive: Joi.boolean().when('type', {
    is: 'short-answer',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  })
});

const questionImportSchema = Joi.object({
  text: Joi.string().min(1).required(),
  questionBank: Joi.string().hex().length(24).allow(null).optional()
});

module.exports = { questionSchema, questionImportSchema };
