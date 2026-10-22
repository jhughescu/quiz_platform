const express = require('express');
const adminController = require('../controllers/admin.controller');
const deploymentController = require('../controllers/deployment.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validateBody } = require('../middleware/validate');
const validateObjectId = require('../middleware/validateObjectId');
const refreshAdminSession = require('../middleware/refreshAdminSession');
const { questionSchema, questionImportSchema } = require('../validators/question.validators');
const { questionBankSchema } = require('../validators/questionBank.validators');
const { deploymentSchema } = require('../validators/deployment.validators');

const ROLES = require('../constants/roles');
const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.SUPERUSER));

router.get('/export-all-questions', refreshAdminSession, adminController.exportAllQuestions);
router.get('/export-question-bank/:id', refreshAdminSession, adminController.exportQuestionBank);
router.get('/questions', refreshAdminSession, adminController.listQuestions);
router.post('/questions', validateBody(questionSchema), refreshAdminSession, adminController.createQuestion);
router.post('/questions/import', validateBody(questionImportSchema), refreshAdminSession, adminController.bulkImportQuestions);
router.put('/questions/:id', validateObjectId('id'), validateBody(questionSchema), refreshAdminSession, adminController.updateQuestion);
router.delete('/questions/:id', validateObjectId('id'), refreshAdminSession, adminController.deleteQuestion);
router.get('/question-banks', refreshAdminSession, adminController.listQuestionBanks);
router.post('/question-banks', validateBody(questionBankSchema), refreshAdminSession, adminController.createQuestionBank);
router.put('/question-banks/:id', validateObjectId('id'), validateBody(questionBankSchema), refreshAdminSession, adminController.updateQuestionBank);
router.delete('/question-banks/:id', validateObjectId('id'), refreshAdminSession, adminController.deleteQuestionBank);
router.get('/templates', refreshAdminSession, adminController.getTemplates);
router.get('/presentations', refreshAdminSession, adminController.getPresentations);
router.post('/deployments', validateBody(deploymentSchema), refreshAdminSession, deploymentController.createDeployment);
router.get('/deployments', refreshAdminSession, deploymentController.listDeployments);
router.get('/deployments/:id', refreshAdminSession, deploymentController.getDeployment);
router.get('/submissions', refreshAdminSession, adminController.listSubmissions);
router.get('/submissions/:id', validateObjectId('id'), refreshAdminSession, adminController.getSubmission);

module.exports = router;