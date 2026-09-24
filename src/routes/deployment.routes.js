const express = require('express');
const router = express.Router();

const deploymentController = require('../controllers/deployment.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
// const { ROLES } = require('../constants/roles');
const ROLES = require('../constants/roles');

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SUPERUSER));

router.post('/', deploymentController.createDeployment);
router.get('/', deploymentController.listDeployments);
router.get('/:id', deploymentController.getDeployment);
router.delete('/:id', deploymentController.deleteDeployment);

module.exports = router;