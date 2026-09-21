const Deployment = require('../models/Deployment');

function findAll(filter = {}) {
  return Deployment.find(filter).sort({ createdAt: -1 });
}

function findById(id) {
  return Deployment.findById(id);
}

function create(data) {
  return Deployment.create(data);
}

function updateById(id, data) {
  return Deployment.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true
    }
  );
}

module.exports = {
  findAll,
  findById,
  create,
  updateById
};