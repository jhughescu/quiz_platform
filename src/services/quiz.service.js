const questionRepository = require('../repositories/question.repository');
const submissionRepository = require('../repositories/submission.repository');
const { QUESTION_TYPES } = require('../models/Question');
const Deployment = require('../models/Deployment');

// Strip whichever field holds the correct answer, based on question type
function sanitizeQuestion(q) {
  const base = { id: q.id, question: q.question, type: q.type };

  switch (q.type) {
    case QUESTION_TYPES.MULTIPLE_CHOICE:
    case QUESTION_TYPES.MULTI_SELECT:
      return { ...base, options: q.options };
    case QUESTION_TYPES.TRUE_FALSE:
      return { ...base, options: ['True', 'False'] };
    case QUESTION_TYPES.SHORT_ANSWER:
      return base;
    default:
      return base;
  }
}

function sanitizeDeploymentQuestion(q) {
  const base = {
    id: q.id,
    question: q.question,
    type: q.type
  };

  switch (q.type) {
    case QUESTION_TYPES.MULTIPLE_CHOICE:
    case QUESTION_TYPES.MULTI_SELECT:
      return {
        ...base,
        options: q.options
      };

    case QUESTION_TYPES.TRUE_FALSE:
      return {
        ...base,
        options: [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False' }
        ]
      };

    case QUESTION_TYPES.SHORT_ANSWER:
      return base;

    default:
      return base;
  }
}

function isCorrect(q, submitted) {
  switch (q.type) {
    case QUESTION_TYPES.MULTIPLE_CHOICE:
      return submitted === q.correctIndex;

    case QUESTION_TYPES.TRUE_FALSE:
      return submitted === q.correctAnswer;

    case QUESTION_TYPES.MULTI_SELECT: {
      if (!Array.isArray(submitted)) return false;
      const given = [...submitted].sort();
      const expected = [...q.correctIndexes].sort();
      return given.length === expected.length && given.every((v, i) => v === expected[i]);
    }

    case QUESTION_TYPES.SHORT_ANSWER: {
      if (typeof submitted !== 'string') return false;
      const normalize = (s) => (q.caseSensitive ? s.trim() : s.trim().toLowerCase());
      return normalize(submitted) === normalize(q.correctAnswer);
    }

    default:
      return false;
  }
}



// Return question data without revealing the answer key
async function getQuestions() {
  const questions = await questionRepository.findAll();
  return questions.map(sanitizeQuestion);
}

async function scoreSubmission(answers) {
  const questions = await questionRepository.findAll();

  let score = 0;
  const results = questions.map((q) => {
    const submitted = answers[q.id];
    const correct = isCorrect(q, submitted);
    if (correct) score += 1;
    return { questionId: q.id, correct };
  });

  const submission = { score, total: questions.length, results };
  await submissionRepository.create(submission);

  return submission;
}

async function getActiveDeployment(id) {
  const deployment = await Deployment.findOne({
    _id: id,
    status: 'active'
  });

  if (!deployment) {
    return null;
  }

  return {
    id: deployment._id,
    name: deployment.name,
    template: deployment.template,
    questions: deployment.questions.map(sanitizeDeploymentQuestion)
  };
}

module.exports = { getQuestions, scoreSubmission, getActiveDeployment };
