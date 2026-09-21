const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const { validateBody } = require('../middleware/validate');
const { loginSchema } = require('../validators/auth.validators');

const router = express.Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
