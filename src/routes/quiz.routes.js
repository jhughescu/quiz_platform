const express = require('express');
const quizController = require('../controllers/quiz.controller');
const { validateBody } = require('../middleware/validate');
const { submitAnswersSchema } = require('../validators/quiz.validators');
const { questionsLimiter, submitLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.get('/questions', questionsLimiter, quizController.getQuestions);
router.get('/quiz/:id', quizController.getQuiz);
router.post('/submit', submitLimiter, validateBody(submitAnswersSchema), quizController.submitAnswers);

module.exports = router;
