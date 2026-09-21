const express = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validateBody } = require('../middleware/validate');
const validateObjectId = require('../middleware/validateObjectId');
const { createUserSchema } = require('../validators/user.validators');
const ROLES = require('../constants/roles');

const router = express.Router();



// Only superusers can register new admins/superusers
router.use(authenticate, authorize(ROLES.SUPERUSER));

router.get('/', userController.listUsers);
router.post('/', validateBody(createUserSchema), userController.createUser);
router.delete('/:id', validateObjectId('id'), userController.deleteUser);

module.exports = router;
