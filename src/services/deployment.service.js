const mongoose = require('mongoose');
const Deployment = require('../models/Deployment');
const QuestionBank = require('../models/QuestionBank');
const questionRepository = require('../repositories/question.repository');
const deploymentRepository = require('../repositories/deployment.repository');

async function createDeployment({
  name,
  questionBankId,
  template,
  randomiseOptions,
  randomiseQuestions,
  user
}) {
  const questionBank = await QuestionBank.findById(questionBankId);

  if (!questionBank) {
    throw new Error('Question bank not found');
  }

  if (!canModify(questionBank, user)) {
    throw new Error('You do not have permission to deploy this question bank');
  }

  const questions = await questionRepository.findByQuestionBank(questionBankId);

  const questionSnapshot = createQuestionSnapshot(questions);

  const deployment = await Deployment.create({
    name,
    createdBy: user.sub,
    sourceQuestionBankId: questionBankId,
    template,
    randomiseOptions,
    randomiseQuestions,
    questions: questionSnapshot
  });

  return deployment;
}

function canModify(entity, user) {
  if (user.role === 'superuser') {
    return true;
  }

  return entity.createdBy.toString() === user.sub;
}

function createQuestionSnapshot(questions) {
  return questions.map((question) => {
    const snapshot = {
      id: `q_${new mongoose.Types.ObjectId().toString()}`,
      type: question.type,
      question: question.question
    };

    if (question.type === 'multiple-choice') {
      snapshot.options = question.options.map((text) => ({
        id: `o_${new mongoose.Types.ObjectId().toString()}`,
        text
      }));

      snapshot.correctOptionId =
        snapshot.options[question.correctIndex].id;
    }

    if (question.type === 'true-false') {
      snapshot.correctAnswer = question.correctAnswer;
    }

    if (question.type === 'multi-select') {
      snapshot.options = question.options.map((text) => ({
        id: `o_${new mongoose.Types.ObjectId().toString()}`,
        text
      }));

      snapshot.correctOptionIds = question.correctIndexes.map(
        (index) => snapshot.options[index].id
      );
    }

    if (question.type === 'short-answer') {
      snapshot.correctAnswer = question.correctAnswer;
      snapshot.caseSensitive = question.caseSensitive;
    }

    return snapshot;
  });
}

async function listDeployments(user) {
  const filter = user.role === 'superuser'
    ? {}
    : { createdBy: user.sub };

  return Deployment.find(filter)
    .sort({ createdAt: -1 })
    .select('name createdBy sourceQuestionBankId template status createdAt updatedAt');
}

async function getDeployment(id, user) {
  const deployment = await Deployment.findById(id);

  if (!deployment) {
    return null;
  }

  if (
    user.role !== 'superuser' &&
    deployment.createdBy.toString() !== user.sub
  ) {
    throw new Error('You do not have permission to view this deployment');
  }

  return deployment;
}
async function getActiveDeployment(id) {
  const deployment = await Deployment.findOne({
    _id: id,
    status: 'active'
  });

  return deployment;
}

async function deleteDeployment(id, user) {
  const deployment = await deploymentRepository.findById(id);

  if (!deployment) {
    return null;
  }

  if (
    user.role !== 'superuser' &&
    deployment.createdBy.toString() !== user.sub
  ) {
    throw new Error('You do not have permission to delete this deployment');
  }

  await deploymentRepository.deleteById(id);

  return deployment;
}

module.exports = {
  createDeployment,
  createQuestionSnapshot,
  listDeployments,
  getDeployment,
  getActiveDeployment,
  deleteDeployment
};