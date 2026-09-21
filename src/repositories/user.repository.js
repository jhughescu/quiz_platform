const User = require('../models/User');

function findAll() {
  return User.find().select('-passwordHash');
}

function findByEmail(email) {
  return User.findOne({ email: email.toLowerCase() });
}

function create(data) {
  return User.create(data);
}

function deleteById(id) {
  return User.findByIdAndDelete(id);
}

module.exports = { findAll, findByEmail, create, deleteById };
