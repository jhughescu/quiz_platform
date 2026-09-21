const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Verifies email + password against the User collection (authProvider: 'local')
module.exports = new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase(), authProvider: 'local' });
      if (!user || !user.passwordHash) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
);
