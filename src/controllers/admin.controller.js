const crypto = require("crypto");
const questionRepository = require("../repositories/question.repository");
const questionBankRepository = require("../repositories/questionBank.repository");
const submissionRepository = require("../repositories/submission.repository");
const questionImportService = require("../services/questionImport.service");
const templateService = require("../services/template.service");
const presentationService = require("../services/presentation.service");
const submissionService = require("../services/submission.service");
const Image = require("../models/Image");
const imageStorageService = require("../services/imageStorage.service");
const imageCleanupService = require("../services/imageCleanup.service");
const languages = require("../config/languages");
const { Question } = require("../models/Question");
const Deployment = require("../models/Deployment");
const ROLES = require("../constants/roles");

function getLanguages(req, res) {
  res.json(languages);
}
function canModify(question, user) {
  return (
    user.role === ROLES.SUPERUSER || String(question.createdBy) === user.sub
  );
}

async function getTemplates(req, res, next) {
  try {
    res.json(templateService.getTemplates());
  } catch (err) {
    next(err);
  }
}
async function getPresentations(req, res, next) {
  try {
    res.json(presentationService.getPresentations());
  } catch (err) {
    next(err);
  }
}
async function validateQuestionBank(questionBankId, user) {
  if (!questionBankId) return null;

  const questionBank = await questionBankRepository.findById(questionBankId);
  if (!questionBank) return "Question bank not found";
  if (!canModify(questionBank, user)) return "Forbidden";
  return null;
}

// Superusers see every question (with owner email); admins only see questions they created
async function listQuestions(req, res, next) {
  try {
    const isSuperuser = req.user.role === ROLES.SUPERUSER;
    const filter = isSuperuser ? {} : { createdBy: req.user.sub };
    res.json(
      await questionRepository.findAll(filter, { populateOwner: isSuperuser }),
    );
  } catch (err) {
    next(err);
  }
}

async function validateImageReference(imageId, user) {
  if (!imageId) return null;
  const image = await Image.findById(imageId).select("uploadedBy");
  if (!image) return "Image not found";
  if (
    user.role !== ROLES.SUPERUSER &&
    image.uploadedBy.toString() !== user.sub
  ) {
    return "Forbidden";
  }
  return null;
}

async function createQuestion(req, res, next) {
  try {
    const imageError = await validateImageReference(req.body.image, req.user);
    if (imageError) {
      return res
        .status(imageError === "Forbidden" ? 403 : 404)
        .json({ error: imageError });
    }
    const bankError = await validateQuestionBank(
      req.body.questionBank,
      req.user,
    );
    if (bankError)
      return res
        .status(bankError === "Forbidden" ? 403 : 404)
        .json({ error: bankError });

    const question = await questionRepository.create({
      ...req.body,
      createdBy: req.user.sub,
    });
    res.status(201).json(question);
  } catch (err) {
    next(err);
  }
}

async function updateQuestion(req, res, next) {
  try {
    const existing = await questionRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Question not found" });
    if (!canModify(existing, req.user))
      return res.status(403).json({ error: "Forbidden" });
    if (req.body.type && req.body.type !== existing.type) {
      return res.status(400).json({
        error:
          "Question type cannot be changed. Delete the question and create a new one.",
      });
    }
    const imageError = await validateImageReference(req.body.image, req.user);
    if (imageError) {
      return res
        .status(imageError === "Forbidden" ? 403 : 404)
        .json({ error: imageError });
    }
    const bankError = await validateQuestionBank(
      req.body.questionBank,
      req.user,
    );
    if (bankError)
      return res
        .status(bankError === "Forbidden" ? 403 : 404)
        .json({ error: bankError });
    const question = await questionRepository.updateById(
      req.params.id,
      req.body,
    );
    res.json(question);
  } catch (err) {
    next(err);
  }
}

async function listQuestionBanks(req, res, next) {
  try {
    const isSuperuser = req.user.role === ROLES.SUPERUSER;
    const filter = isSuperuser ? {} : { createdBy: req.user.sub };
    const [banks, counts] = await Promise.all([
      questionBankRepository.findAll(filter, { populateOwner: isSuperuser }),
      questionRepository.countByQuestionBank(),
    ]);
    res.json(
      banks.map((bank) => ({
        ...bank.toObject(),
        questionCount: counts.get(bank._id.toString()) || 0,
      })),
    );
  } catch (err) {
    next(err);
  }
}

async function createQuestionBank(req, res, next) {
  try {
    const questionBank = await questionBankRepository.create({
      ...req.body,
      createdBy: req.user.sub,
    });
    res.status(201).json(questionBank);
  } catch (err) {
    next(err);
  }
}

async function updateQuestionBank(req, res, next) {
  try {
    const existing = await questionBankRepository.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ error: "Question bank not found" });
    if (!canModify(existing, req.user))
      return res.status(403).json({ error: "Forbidden" });

    res.json(await questionBankRepository.updateById(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function deleteQuestionBank(req, res, next) {
  try {
    const existing = await questionBankRepository.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ error: "Question bank not found" });
    if (!canModify(existing, req.user))
      return res.status(403).json({ error: "Forbidden" });
    const action = req.query.action;
    if (!["delete", "unbank"].includes(action))
      return res.status(400).json({ error: "Invalid deletion action" });
    if (action === "unbank") {
      await questionRepository.clearQuestionBank(existing._id);
    } else {
      const questions = await questionRepository.findByQuestionBank(
        existing._id,
      );
      await questionRepository.deleteByQuestionBank(existing._id);
      const imageIds = [
        ...new Set(
          questions
            .filter((question) => question.image)
            .map((question) => question.image.toString()),
        ),
      ];
      for (const imageId of imageIds) {
        await imageCleanupService.deleteImageIfUnused(imageId);
      }
    }
    await questionBankRepository.deleteById(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    const existing = await questionRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Question not found" });
    if (!canModify(existing, req.user))
      return res.status(403).json({ error: "Forbidden" });

    await questionRepository.deleteById(req.params.id);
    if (existing.image) {
      await imageCleanupService.deleteImageIfUnused(existing.image);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Parses the bulk-import text format, rejects on any structural/duplicate-in-batch
// errors, then rejects if any parsed question already exists for this user.
// Any @QuestionBank name that doesn't match an existing bank owned by this user
// is created automatically before questions are saved.
async function bulkImportQuestions(req, res, next) {
  try {
    const bankError = await validateQuestionBank(
      req.body.questionBank,
      req.user,
    );
    if (bankError)
      return res
        .status(bankError === "Forbidden" ? 403 : 404)
        .json({ error: bankError });

    const { questions, errors } = questionImportService.parseImportText(
      req.body.text,
    );
    if (errors.length > 0) {
      return res
        .status(422)
        .json({ error: "Import validation failed", details: errors });
    }

    const existing = await questionRepository.findAll({
      createdBy: req.user.sub,
    });
    const existingKeys = new Set(
      existing.map(
        (q) => `${q.type}::${questionImportService.normalize(q.question)}`,
      ),
    );

    const duplicateErrors = questions
      .filter((q) =>
        existingKeys.has(
          `${q.type}::${questionImportService.normalize(q.question)}`,
        ),
      )
      .map(
        (q) => `"${q.question.slice(0, 60)}": already exists in your questions`,
      );

    if (duplicateErrors.length > 0) {
      return res
        .status(409)
        .json({ error: "Duplicate questions found", details: duplicateErrors });
    }

    const ownedBanks = await questionBankRepository.findAll({
      createdBy: req.user.sub,
    });
    const banksByName = new Map(
      ownedBanks.map((bank) => [bank.name.trim().toLowerCase(), bank]),
    );

    const missingBankNames = new Map();
    questions.forEach((q) => {
      if (!q.questionBankName) return;
      const name = q.questionBankName.trim();
      const key = name.toLowerCase();
      if (!banksByName.has(key) && !missingBankNames.has(key))
        missingBankNames.set(key, name);
    });

    for (const [key, name] of missingBankNames) {
      banksByName.set(
        key,
        await questionBankRepository.create({ name, createdBy: req.user.sub }),
      );
    }

    const payload = questions.map((q) => {
      const { questionBankName, ...question } = q;
      const questionBank = questionBankName
        ? banksByName.get(questionBankName.trim().toLowerCase())._id
        : req.body.questionBank || null;
      return { ...question, questionBank, createdBy: req.user.sub };
    });

    const created = await questionRepository.createMany(payload);
    res.status(201).json({
      imported: created.length,
      questions: created,
      createdQuestionBanks: [...missingBankNames.values()],
    });
  } catch (err) {
    next(err);
  }
}

function formatQuestion(question) {
  let str = `\n[${question.type}]\n`;
  str += `${question.question}\n`;

  if (question.type === "multiple-choice" || question.type === "multi-select") {
    const corr =
      question.type === "multiple-choice"
        ? [question.correctIndex]
        : question.correctIndexes;

    for (const [index, option] of question.options.entries()) {
      str += `${corr.includes(index) ? "*" : ""}${option}\n`;
    }
  }

  if (question.type === "true-false") {
    str += `${question.correctAnswer ? "True" : "False"}\n`;
  }

  if (question.type === "short-answer") {
    str += `${question.correctAnswer}\n`;
  }

  return str;
}

async function exportQuestionBank(req, res, next) {
  try {
    const questionBankId = req.params.id;
    const questionBanks = await questionBankRepository.findAll();
    const questions = await questionRepository.findAll();

    const questionBank = questionBanks.find(
      (bank) => bank._id.toString() === questionBankId,
    );
    if (!questionBank) {
      return res.status(404).json({
        error: "Question bank not found",
      });
    }
    const questionSet = questions.filter(
      (q) => q.questionBank && q.questionBank.toString() === questionBankId,
    );
    let str = `@QuestionBank: ${questionBank.name}\n`;
    for (const question of questionSet) {
      str += formatQuestion(question);
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${questionBank.name}.txt"`,
    );
    res.send(str);
  } catch (err) {
    next(err);
  }
}
async function exportAllQuestions(req, res, next) {
  const questionBanks = await questionBankRepository.findAll();
  const questions = await questionRepository.findAll();
  let str = "";
  const unbankedQuestions = questions.filter((q) => !q.questionBank);
  if (unbankedQuestions.length > 0) {
    for (const question of unbankedQuestions) {
      str += formatQuestion(question);
    }
  }
  for (const questionBank of questionBanks) {
    const questionSet = questions.filter(
      (q) =>
        q.questionBank &&
        q.questionBank.toString() === questionBank._id.toString(),
    );
    if (questionSet.length > 0) {
      str += `\n@QuestionBank: ${questionBank.name}\n`;
      for (const question of questionSet) {
        str += formatQuestion(question);
      }
    }
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="question-banks-all-export.txt"',
  );
  res.send(str);
}

async function uploadImage(req, res, next) {
  let storageKey;
  let fileSaved = false;
  try {
    const contentHash = crypto
      .createHash("sha256")
      .update(req.file.buffer)
      .digest("hex");
    const existingUserImage = await Image.findOne({
      contentHash,
      uploadedBy: req.user.sub,
    });
    if (existingUserImage) {
      return res.status(200).json({
        id: existingUserImage._id,
        mimeType: existingUserImage.mimeType,
        size: existingUserImage.size,
      });
    }
    const existingSharedImage = await Image.findOne({ contentHash });
    if (existingSharedImage) {
      storageKey = existingSharedImage.storageKey;
    } else {
      storageKey = await imageStorageService.save(
        req.file.buffer,
        req.file.mimetype,
      );
      fileSaved = true;
    }
    const image = await Image.create({
      storageKey,
      contentHash,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.sub,
    });
    res.status(201).json({
      id: image._id,
      mimeType: image.mimeType,
      size: image.size,
    });
  } catch (err) {
    if (fileSaved && storageKey) {
      try {
        await imageStorageService.remove(storageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to remove image after upload error:",
          cleanupError,
        );
      }
    }
    next(err);
  }
}

async function cleanupOrphanedImages(req, res, next) {
  try {
    if (req.user.role !== ROLES.SUPERUSER) {
      return res.status(403).json({
        error: "You do not have permission to run image cleanup",
      });
    }
    const result = await imageCleanupService.cleanupOrphanedImages();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
async function cleanupOrphanedFiles(req, res, next) {
  try {
    if (req.user.role !== ROLES.SUPERUSER) {
      return res.status(403).json({
        error: "You do not have permission to clean up orphaned image files",
      });
    }
    const result = await imageCleanupService.cleanupOrphanedFiles();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
async function reconcileImageStorage(req, res, next) {
  try {
    if (req.user.role !== ROLES.SUPERUSER) {
      return res.status(403).json({
        error: "You do not have permission to reconcile image storage",
      });
    }
    const result = await imageCleanupService.reconcileImageStorage();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
async function reportMissingImageReferences(req, res, next) {
  try {
    if (req.user.role !== ROLES.SUPERUSER) {
      return res.status(403).json({
        error: "You do not have permission to report missing image references",
      });
    }
    const result = await imageCleanupService.reportMissingImageReferences();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
async function deleteImage(req, res, next) {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }
    if (
      req.user.role !== ROLES.SUPERUSER &&
      image.uploadedBy.toString() !== req.user.sub
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const deleted = await imageCleanupService.deleteImageIfUnused(image._id);
    if (!deleted) {
      return res.status(409).json({
        error: "Image cannot be deleted because it is still in use",
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
async function listImages(req, res, next) {
  try {
    const filter =
      req.user.role === ROLES.SUPERUSER ? {} : { uploadedBy: req.user.sub };
    let imageQuery = Image.find(filter).select(
      "_id originalName mimeType size createdAt",
    );
    if (req.user.role === ROLES.SUPERUSER) {
      imageQuery = imageQuery.populate("uploadedBy", "email");
    }
    const images = await imageQuery.sort({ createdAt: -1 }).lean();
    const imageIds = images.map((image) => image._id);
    const [questions, deployments] = await Promise.all([
      Question.find({ image: { $in: imageIds } })
        .select("image question questionBank")
        .populate("questionBank", "name")
        .lean(),
      Deployment.find({ "questions.image": { $in: imageIds } })
        .select("name questions.image")
        .lean(),
    ]);
    const questionMap = new Map();
    const deploymentMap = new Map();
    for (const question of questions) {
      const imageId = question.image.toString();
      if (!questionMap.has(imageId)) {
        questionMap.set(imageId, []);
      }
      const questionBankName = question.questionBank?.name || "Unassigned";
      questionMap.get(imageId).push({
        question: question.question,
        questionBank: questionBankName,
        hasQuestionBank: !["unassigned", "unbanked"].includes(
          questionBankName.trim().toLowerCase(),
        ),
      });
    }
    for (const deployment of deployments) {
      for (const deploymentQuestion of deployment.questions) {
        if (!deploymentQuestion.image) continue;
        const imageId = deploymentQuestion.image.toString();
        if (!deploymentMap.has(imageId)) {
          deploymentMap.set(imageId, []);
        }
        const associatedDeployments = deploymentMap.get(imageId);
        if (
          !associatedDeployments.some((item) => item.name === deployment.name)
        ) {
          associatedDeployments.push({
            name: deployment.name,
          });
        }
      }
    }
    const result = images.map((image) => {
      const imageId = image._id.toString();
      const associatedQuestions = questionMap.get(imageId) || [];
      const associatedDeployments = deploymentMap.get(imageId) || [];
      return {
        ...image,
        uploadedByOther:
          image.uploadedBy && image.uploadedBy._id.toString() !== req.user.sub,
        questions: associatedQuestions,
        deployments: associatedDeployments,
        isUnused:
          associatedQuestions.length === 0 &&
          associatedDeployments.length === 0,
      };
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listSubmissions(req, res, next) {
  try {
    res.json(await submissionService.listSubmissions(req.user));
  } catch (err) {
    next(err);
  }
}

async function getSubmission(req, res, next) {
  try {
    const submission = await submissionService.getSubmission(
      req.params.id,
      req.user,
    );
    if (!submission)
      return res.status(404).json({ error: "Submission not found" });
    res.json(submission);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkImportQuestions,
  exportAllQuestions,
  exportQuestionBank,
  listQuestionBanks,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  listSubmissions,
  getSubmission,
  getTemplates,
  getPresentations,
  getLanguages,
  uploadImage,
  cleanupOrphanedImages,
  cleanupOrphanedFiles,
  deleteImage,
  listImages,
  reconcileImageStorage,
  reportMissingImageReferences,
};
