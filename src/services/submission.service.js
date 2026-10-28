const submissionRepository = require('../repositories/submission.repository');
async function listSubmissions(user) {
  if (user.role === 'superuser') {
    return submissionRepository.findAll();
  }
  return submissionRepository.findAllByDeploymentOwner(user.sub);
}
async function getSubmission(id, user) {
  const submission = await submissionRepository.findById(id);
  if (!submission) {
    return null;
  }
  if (user.role !== 'superuser' && submission.deployment.createdBy.toString() !== user.sub) {
    return null;
  }
  return submission;
}
module.exports = { listSubmissions, getSubmission };