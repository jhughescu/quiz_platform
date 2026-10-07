const Submission = require('../models/Submission');

function create(data) {
  return Submission.create(data);
}

function findAll() {
  return Submission.find().sort({ createdAt: -1 });
}

function findById(id) {
  return Submission.findById(id);
}

function updateById(id, data) {
  return Submission.findByIdAndUpdate(
    id,
    data,
    { new: true, runValidators: true }
  );
}

module.exports = { create, findAll, findById, updateById };