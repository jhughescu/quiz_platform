const quizService = require('../services/quiz.service');


async function getQuestions(req, res, next) {
  try {
    res.json(await quizService.getQuestions());
  } catch (err) {
    next(err);
  }
}

async function submitAnswers(req, res, next) {
  const { deploymentId, answers } = req.body;
  try {
    res.json(await quizService.scoreSubmission(deploymentId, answers));
  } catch (err) {
    next(err);
  }
}

async function getQuiz(req, res, next) {
  try {
    const deployment = await quizService.getActiveDeployment(
      req.params.id
    );
    if (!deployment) {
      return res.status(404).json({
        error: 'Quiz not found'
      });
    }
    res.json(deployment);
  } catch (err) {
    next(err);
  }
}

async function getQuizReview(req, res, next) {
  try {
    const deployment = await quizService.getActiveDeployment(
      req.params.id,
      true
    );
    if (!deployment) {
      return res.status(404).json({
        error: 'Quiz not found'
      });
    }
    res.json(deployment);
  } catch (err) {
    next(err);
  }
}

async function createSubmission(req, res, next) {
  const { deploymentId, questionId, answer } = req.body;
  try {
    res.json(
      await quizService.createSubmission(
        deploymentId,
        questionId,
        answer
      )
    );
  } catch (err) {
    next(err);
  }
}
async function updateSubmission(req, res, next) {
  const { questionId, answer } = req.body;
  try {
    res.json(
      await quizService.updateSubmission(
        req.params.id,
        questionId,
        answer
      )
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuestions,
  submitAnswers,
  createSubmission,
  updateSubmission,
  getQuiz,
  getQuizReview
};
