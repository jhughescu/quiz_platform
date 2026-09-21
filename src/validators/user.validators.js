const Joi = require('joi');
const ROLES = require('../constants/roles');

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(ROLES.ADMIN, ROLES.SUPERUSER).required()
});

module.exports = { createUserSchema };
