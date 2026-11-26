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
async function reconcileImageStorage() {
  const [images, files] = await Promise.all([
    Image.distinct("storageKey"),
    imageStorageService.list(),
  ]);
  const databaseKeys = new Set(images);
  const filesystemKeys = new Set(files);
  const orphanedFiles = files.filter((file) => !databaseKeys.has(file));
  const missingFiles = images.filter((key) => !filesystemKeys.has(key));
  return {
    filesExamined: files.length,
    storageKeysExamined: images.length,
    orphanedFiles,
    missingFiles,
  };
}
async function reportMissingImageReferences() {
  const reconciliation = await reconcileImageStorage();
  const missingFiles = reconciliation.missingFiles;
  if (missingFiles.length === 0) {
    return {
      examined: 0,
      results: [],
    };
  }
  const images = await Image.find({
    storageKey: { $in: missingFiles },
  }).select("_id storageKey uploadedBy originalName");
  const imageIds = images.map((image) => image._id);
  const [questions, deployments] = await Promise.all([
    Question.find({ image: { $in: imageIds } }).select("_id question image"),
    Deployment.find({ "questions.image": { $in: imageIds } }).select(
      "_id name questions",
    ),
  ]);
  const results = missingFiles.map((storageKey) => {
    const fileImages = images.filter(
      (image) => image.storageKey === storageKey,
    );
    const fileImageIds = fileImages.map((image) => image._id.toString());
    const questionReferences = questions
      .filter((question) => fileImageIds.includes(question.image.toString()))
      .map((question) => ({
        id: question._id,
        question: question.question,
      }));
    const deploymentReferences = deployments
      .map((deployment) => ({
        id: deployment._id,
        name: deployment.name,
        questions: deployment.questions
          .filter(
            (question) =>
              question.image &&
              fileImageIds.includes(question.image.toString()),
          )
          .map((question) => ({
            id: question.id,
            question: question.question,
          })),
      }))
      .filter((deployment) => deployment.questions.length > 0);
    let status = "unreferenced";
    if (questionReferences.length && deploymentReferences.length) {
      status = "referenced-by-both";
    } else if (questionReferences.length) {
      status = "referenced-by-questions";
    } else if (deploymentReferences.length) {
      status = "referenced-by-deployments";
    }
    return {
      storageKey,
      imageRecords: fileImages,
      questionReferences,
      deploymentReferences,
      status,
    };
  });
  return {
    examined: results.length,
    results,
  };
}
async function cleanupOrphanedFiles() {
  const reconciliation = await reconcileImageStorage();
  const deleted = [];
  const retained = [];
  const failed = [];
  for (const file of reconciliation.orphanedFiles) {
    try {
      const databaseReference = await Image.exists({ storageKey: file });
      if (databaseReference) {
        retained.push(file);
        continue;
      }
      await imageStorageService.remove(file);
      deleted.push(file);
    } catch (err) {
      failed.push({
        file,
        error: err.message,
      });
    }
  }
  return {
    examined: reconciliation.orphanedFiles.length,
    deleted,
    retained,
    failed,
  };
}
module.exports = { deleteImageIfUnused, cleanupOrphanedImages, reconcileImageStorage, cleanupOrphanedFiles, reportMissingImageReferences };