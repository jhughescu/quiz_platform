const mongoose = require('mongoose');
const ROLES = require('../constants/roles');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String }, // only set for authProvider 'local'
  role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
  // 'local' today; add 'sso' when the organisation's SSO is wired up
  authProvider: { type: String, enum: ['local', 'sso'], default: 'local' },
  providerId: { type: String } // external subject/id once authProvider is 'sso'
});

module.exports = mongoose.model('User', userSchema);
