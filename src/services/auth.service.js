const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config');

// Shape stays the same no matter which strategy authenticated the user
function issueToken(user) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set. Add it to your .env file.');
  }

  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn
  });
}

function verifyToken(token) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set. Add it to your .env file.');
  }

  return jwt.verify(token, jwtSecret);
}

module.exports = { issueToken, verifyToken };
