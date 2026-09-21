const passport = require('../auth/passport');
const { issueToken } = require('../services/auth.service');

function login(req, res, next) {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid email or password' });

    const token = issueToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  })(req, res, next);
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
