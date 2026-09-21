const questionRepository = require("../repositories/question.repository");
const questionBankRepository = require("../repositories/questionBank.repository");
const submissionRepository = require("../repositories/submission.repository");
const questionImportService = require("../services/questionImport.service");
const ROLES = require("../constants/roles");

function canModify(question, user) {
  return (
    user.role === ROLES.SUPERUSER || String(question.createdBy) === user.sub
  );
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

async function createQuestion(req, res, next) {
  try {
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
    res.json(
      await questionBankRepository.findAll(filter, {
        populateOwner: isSuperuser,
      }),
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

    await questionRepository.clearQuestionBank(existing._id);
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

  if (
    question.type === "multiple-choice" ||
    question.type === "multi-select"
  ) {
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
      (q) => q.questionBank.toString() === questionBankId,
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

  for (const questionBank of questionBanks) {
    const questionSet = questions.filter(
      (q) => q.questionBank.toString() === questionBank._id.toString(),
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

async function exportAllQuestionsV1(req, res, next) {
  const questionBanks = await questionBankRepository.findAll();
  const questions = await questionRepository.findAll();
  let str = "";
  for (const questionBank of questionBanks) {
    const questionSet = questions.filter(
      (q) => q.questionBank.toString() === questionBank._id.toString(),
    );
    if (questionSet.length > 0) {
      str += `\n@QuestionBank: ${questionBank.name}\n`;
      for (const question of questionSet) {
        str += `\n[${question.type}]\n`;
        str += `${question.question}\n`;
        if (
          question.type === "multiple-choice" ||
          question.type === "multi-select"
        ) {
          const corr =
            question.type === "multiple-choice"
              ? [question.correctIndex]
              : question.correctIndexes;
          for (const [index, option] of question.options.entries()) {
            str += `${corr.includes(index) ? "*" : ""}${option}\n`;
          }
        }
        if (question.type === "true-false") {
          str += `*${question.correctAnswer ? "True" : "False"}\n`;
        }
        if (question.type === "short-answer") {
          str += `*${question.correctAnswer}\n`;
        }
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

async function listSubmissions(req, res, next) {
  try {
    res.json(await submissionRepository.findAll());
  } catch (err) {
    next(err);
  }
}

async function getSubmission(req, res, next) {
  try {
    const submission = await submissionRepository.findById(req.params.id);
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
};
