const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  results: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
      correct: { type: Boolean, required: true }
    }
  ],
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
