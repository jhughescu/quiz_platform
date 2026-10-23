const { issueToken } = require("../services/auth.service");
function refreshAdminSession(req, res, next) {
  if (req.get("X-User-Activity") !== "true") {
    return next();
  }
  const token = issueToken({
    id: req.user.sub,
    email: req.user.email,
    role: req.user.role,
  });
  res.setHeader("X-Renewed-Token", token);
  next();
}
module.exports = refreshAdminSession;
