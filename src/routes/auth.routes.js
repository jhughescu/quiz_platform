const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const { jwtExpiresIn } = require('../config');
const { validateBody } = require('../middleware/validate');
const { loginSchema } = require('../validators/auth.validators');

const router = express.Router();

router.get('/session-config', (req, res) => {
  const match = /^(\d+)(s|m|h|d)$/.exec(jwtExpiresIn);
  if (!match) {
    return res.status(500).json({ error: 'Invalid JWT_EXPIRES_IN configuration' });
  }
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  res.json({ sessionTimeoutMs: Number(match[1]) * multipliers[match[2]] });
});

router.post('/login', validateBody(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
