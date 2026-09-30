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
      return submitted === q.correctOptionId;

    case QUESTION_TYPES.TRUE_FALSE:
      return submitted === String(q.correctAnswer);

    case QUESTION_TYPES.MULTI_SELECT: {
      if (!Array.isArray(submitted)) {
        return false;
      }

      const given = [...submitted].sort();
      const expected = [...q.correctOptionIds].sort();

      return (
        given.length === expected.length &&
        given.every((value, index) => value === expected[index])
      );
    }

    case QUESTION_TYPES.SHORT_ANSWER: {
      if (typeof submitted !== 'string') {
        return false;
      }

      const normalize = (value) => {
        return q.caseSensitive
          ? value.trim()
          : value.trim().toLowerCase();
      };

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

async function scoreSubmission(deploymentId, answers) {
  const deployment = await Deployment.findOne({
    _id: deploymentId,
    status: 'active'
  });

  if (!deployment) {
    throw new Error('Deployment not found');
  }

  let score = 0;

  const results = deployment.questions.map((q, index) => {
  const submitted = answers[q.id];
  const correct = isCorrect(q, submitted);


  if (correct) {
    score += 1;
  }

  return {
    questionId: q.id,
    correct
  };
});

  const submission = {
    score,
    total: deployment.questions.length,
    results
  };

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
    randomiseOptions: deployment.randomiseOptions,
    randomiseQuestions: deployment.randomiseQuestions,
    questions: deployment.questions.map(sanitizeDeploymentQuestion)
  };
}

module.exports = { getQuestions, scoreSubmission, getActiveDeployment };
