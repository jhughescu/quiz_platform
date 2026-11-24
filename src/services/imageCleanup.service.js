const Image = require("../models/Image");
const { Question } = require("../models/Question");
const Deployment = require("../models/Deployment");
const imageStorageService = require("./imageStorage.service");

async function deleteImageIfUnused(imageId) {
  const image = await Image.findById(imageId);
  if (!image) return false;
  const [questionReference, deploymentReference] = await Promise.all([
    Question.exists({ image: imageId }),
    Deployment.exists({ "questions.image": imageId }),
  ]);
  if (questionReference || deploymentReference) return false;
  await Image.deleteOne({ _id: imageId });
  const remainingReferences = await Image.countDocuments({
    storageKey: image.storageKey,
  });
  if (remainingReferences === 0) {
    await imageStorageService.remove(image.storageKey);
  }
  return true;
}
async function cleanupOrphanedImages() {
  const images = await Image.find().select("_id");
  let deleted = 0;
  for (const image of images) {
    const wasDeleted = await deleteImageIfUnused(image._id);
    if (wasDeleted) {
      deleted++;
    }
  }
  return {
    examined: images.length,
    deleted,
    retained: images.length - deleted,
  };
}

module.exports = { deleteImageIfUnused, cleanupOrphanedImages };