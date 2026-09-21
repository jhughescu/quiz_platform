const QuestionBank = require('../models/QuestionBank');

function findAll(filter = {}, { populateOwner = false } = {}) {
  const query = QuestionBank.find(filter).sort({ name: 1 });
  return populateOwner ? query.populate('createdBy', 'email') : query;
}

function findById(id) {
  return QuestionBank.findById(id);
}

function create(data) {
  return QuestionBank.create(data);
}

function updateById(id, data) {
  return QuestionBank.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

function deleteById(id) {
  return QuestionBank.findByIdAndDelete(id);
}

module.exports = { findAll, findById, create, updateById, deleteById };