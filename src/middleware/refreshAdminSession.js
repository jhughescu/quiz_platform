const { issueToken } = require('../services/auth.service');
function refreshAdminSession(req, res, next) {
  console.log("### refreshAdminSession EXECUTED ###");
  console.log("refreshAdminSession:", req.path, "activity:", req.get('X-User-Activity'));
  if (req.get('X-User-Activity') !== 'true') {
    return next();
  }
  const token = issueToken({
    id: req.user.sub,
    email: req.user.email,
    role: req.user.role,
  });
  console.log("RENEWING TOKEN:", req.path);
  res.setHeader('X-Renewed-Token', token);
  next();
}
module.exports = refreshAdminSession;