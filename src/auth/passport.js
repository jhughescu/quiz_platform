const passport = require('passport');
const localStrategy = require('./localStrategy');

// Register auth strategies here. Add an OIDC/SAML strategy for the
// organisation's SSO later; authenticate/authorize middleware won't need to change.
passport.use('local', localStrategy);

module.exports = passport;
