const mongoose = require('mongoose');

const deploymentOptionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const deploymentQuestionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },

    type: {
      type: String,
      required: true
    },

    question: {
      type: String,
      required: true
    },

    options: {
      type: [deploymentOptionSchema],
      default: undefined
    },

    correctOptionId: {
      type: String
    },

    correctOptionIds: {
      type: [String]
    },

    correctAnswer: {
      type: String
    },

    caseSensitive: {
      type: Boolean
    }
  },
  { _id: false }
);

const deploymentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    sourceQuestionBankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionBank',
      required: true
    },

    template: {
      id: {
        type: String,
        required: true
      },

      version: {
        type: String,
        required: true
      }
    },

    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active'
    },

    questions: {
      type: [deploymentQuestionSchema],
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deployment', deploymentSchema);