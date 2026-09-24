const deploymentService = require('../services/deployment.service');
async function createDeployment(req, res) {
  try {
    const { name, questionBankId, template } = req.body;

    const deployment = await deploymentService.createDeployment({
      name,
      questionBankId,
      template,
      user: req.user
    });
    return res.status(201).json(deployment);
  } catch (err) {
    console.error('Error creating deployment:', err);
    console.error('Validation details:', err.errors);

    if (err.message === 'Question bank not found') {
      return res.status(404).json({
        error: err.message
      });
    }

    if (err.message === 'You do not have permission to deploy this question bank') {
      return res.status(403).json({
        error: err.message
      });
    }

    return res.status(500).json({
      error: 'Failed to create deployment'
    });
  }
}
async function listDeployments(req, res) {
  try {
    const deployments = await deploymentService.listDeployments(req.user);

    return res.json(deployments);
  } catch (err) {
    console.error('Error listing deployments:', err);

    return res.status(500).json({
      error: 'Failed to list deployments'
    });
  }
}
async function getDeployment(req, res) {
  try {
    const deployment = await deploymentService.getDeployment(
      req.params.id,
      req.user
    );

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found'
      });
    }

    return res.json(deployment);
  } catch (err) {
    console.error('Error getting deployment:', err);

    if (err.message === 'You do not have permission to view this deployment') {
      return res.status(403).json({
        error: err.message
      });
    }

    return res.status(500).json({
      error: 'Failed to get deployment'
    });
  }
}
async function deleteDeployment(req, res) {
  try {
    const deployment = await deploymentService.deleteDeployment(
      req.params.id,
      req.user
    );

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found'
      });
    }

    return res.json({
      message: 'Deployment deleted'
    });
  } catch (err) {
    console.error('Error deleting deployment:', err);

    if (err.message === 'You do not have permission to delete this deployment') {
      return res.status(403).json({
        error: err.message
      });
    }

    return res.status(500).json({
      error: 'Failed to delete deployment'
    });
  }
}

module.exports = {
    createDeployment,
    listDeployments,
    getDeployment,
    deleteDeployment
};