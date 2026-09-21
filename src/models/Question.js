const mongoose = require('mongoose');

const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple-choice',
  TRUE_FALSE: 'true-false',
  MULTI_SELECT: 'multi-select',
  SHORT_ANSWER: 'short-answer'
};

// Base schema holds fields common to every question type; `type` is the discriminator key
const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    // Owner used to scope 'admin' role edit/delete permissions; superusers bypass this
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    questionBank: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank', default: null }
  },
  { discriminatorKey: 'type' }
);

const Question = mongoose.model('Question', questionSchema);

const MultipleChoice = Question.discriminator(
  QUESTION_TYPES.MULTIPLE_CHOICE,
  new mongoose.Schema({
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (opts) => opts.length >= 2,
        message: 'options must contain at least 2 items'
      }
    },
    correctIndex: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value >= 0 && value < this.options.length;
        },
        message: 'correctIndex must reference a valid options index'
      }
    }
  })
);

const TrueFalse = Question.discriminator(
  QUESTION_TYPES.TRUE_FALSE,
  new mongoose.Schema({
    correctAnswer: { type: Boolean, required: true }
  })
);

const MultiSelect = Question.discriminator(
  QUESTION_TYPES.MULTI_SELECT,
  new mongoose.Schema({
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (opts) => opts.length >= 2,
        message: 'options must contain at least 2 items'
      }
    },
    correctIndexes: {
      type: [Number],
      required: true,
      validate: {
        validator: function (arr) {
          return arr.length >= 1 && arr.every((i) => i >= 0 && i < this.options.length);
        },
        message: 'correctIndexes must be non-empty and reference valid options indexes'
      }
    }
  })
);

const ShortAnswer = Question.discriminator(
  QUESTION_TYPES.SHORT_ANSWER,
  new mongoose.Schema({
    correctAnswer: { type: String, required: true },
    caseSensitive: { type: Boolean, default: false }
  })
);

module.exports = { Question, MultipleChoice, TrueFalse, MultiSelect, ShortAnswer, QUESTION_TYPES };

