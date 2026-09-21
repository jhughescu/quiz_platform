const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');

async function createUser({ email, password, role }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    const err = new Error('A user with this email already exists');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return userRepository.create({ email: email.toLowerCase(), passwordHash, role, authProvider: 'local' });
}

module.exports = { createUser };
