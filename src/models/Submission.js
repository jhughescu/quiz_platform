const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  deploymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deployment',
    required: true
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress',
    required: true
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  score: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  results: [
    {
      questionId: { type: String, required: true },
      correct: { type: Boolean, required: true }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Submission', submissionSchema);