const express = require('express');
const quizController = require('../controllers/quiz.controller');
const { validateBody } = require('../middleware/validate');
const { submitAnswersSchema } = require('../validators/quiz.validators');
const { questionsLimiter, submitLimiter } = require('../middleware/rateLimiters');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');

const router = express.Router();

router.get('/questions', questionsLimiter, quizController.getQuestions);
router.get('/quiz/:id', quizController.getQuiz);
router.get(
  '/quiz/:id/review',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPERUSER),
  quizController.getQuizReview
);
router.post('/submit', submitLimiter, validateBody(submitAnswersSchema), quizController.submitAnswers);

module.exports = router;
