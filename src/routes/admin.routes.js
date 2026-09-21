const express = require('express');
const adminController = require('../controllers/admin.controller');
const deploymentController = require('../controllers/deployment.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validateBody } = require('../middleware/validate');
const validateObjectId = require('../middleware/validateObjectId');
const { questionSchema, questionImportSchema } = require('../validators/question.validators');
const { questionBankSchema } = require('../validators/questionBank.validators');
const { deploymentSchema } = require('../validators/deployment.validators');
const ROLES = require('../constants/roles');

const router = express.Router();




router.use(authenticate, authorize(ROLES.ADMIN, ROLES.SUPERUSER));

router.get('/export-all-questions', adminController.exportAllQuestions);
router.get('/export-question-bank/:id', adminController.exportQuestionBank);

router.get('/questions', adminController.listQuestions);
router.post('/questions', validateBody(questionSchema), adminController.createQuestion);
router.post('/questions/import', validateBody(questionImportSchema), adminController.bulkImportQuestions);
router.put('/questions/:id', validateObjectId('id'), validateBody(questionSchema), adminController.updateQuestion);
router.delete('/questions/:id', validateObjectId('id'), adminController.deleteQuestion);



router.get('/question-banks', adminController.listQuestionBanks);
router.post('/question-banks', validateBody(questionBankSchema), adminController.createQuestionBank);
router.put('/question-banks/:id', validateObjectId('id'), validateBody(questionBankSchema), adminController.updateQuestionBank);
router.delete('/question-banks/:id', validateObjectId('id'), adminController.deleteQuestionBank);

router.post(
  '/deployments',
  validateBody(deploymentSchema),
  deploymentController.createDeployment
);
router.get('/deployments', deploymentController.listDeployments);
router.get('/deployments/:id', deploymentController.getDeployment);

router.get('/submissions', adminController.listSubmissions);
router.get('/submissions/:id', validateObjectId('id'), adminController.getSubmission);

module.exports = router;
