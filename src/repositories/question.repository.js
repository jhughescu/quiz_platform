const { Question } = require('../models/Question');

function findAll(filter = {}, { populateOwner = false } = {}) {
  const query = Question.find(filter);
  return populateOwner ? query.populate('createdBy', 'email') : query;
}

function findById(id) {
  return Question.findById(id);
}

function findByQuestionBank(questionBankId) {
  return Question.find({
    questionBank: questionBankId
  });
}

function create(data) {
  return Question.create(data);
}

function createMany(docs) {
  return Question.create(docs);
}

// Load as its discriminator subclass first so .save() applies the right type-specific validation
async function updateById(id, data) {
  const doc = await Question.findById(id);
  if (!doc) return null;

  Object.assign(doc, data);
  return doc.save();
}

function deleteById(id) {
  return Question.findByIdAndDelete(id);
}

function clearQuestionBank(questionBankId) {
  return Question.updateMany({ questionBank: questionBankId }, { $set: { questionBank: null } });
}
  
module.exports = { findAll, findById, findByQuestionBank, create, createMany, updateById, deleteById, clearQuestionBank };
