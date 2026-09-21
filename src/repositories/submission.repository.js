const Submission = require('../models/Submission');

function create(data) {
  return Submission.create(data);
}

function findAll() {
  return Submission.find().sort({ submittedAt: -1 });
}

function findById(id) {
  return Submission.findById(id);
}

module.exports = { create, findAll, findById };
