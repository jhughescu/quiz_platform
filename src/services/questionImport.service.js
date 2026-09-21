const TYPE_ALIASES = {
  multiplechoice: "multiple-choice",
  truefalse: "true-false",
  multiselect: "multi-select",
  shortanswer: "short-answer",
  "multiple-choice": "multiple-choice",
  "true-false": "true-false",
  "multi-select": "multi-select",
  "short-answer": "short-answer",
};

// const HEADER_RE = /^\[([A-Za-z]+)\]$/;
const HEADER_RE = /^\[([A-Za-z-]+)\]$/;
const METADATA_RE = /^@([A-Za-z0-9_]+):\s*(.+)$/;

function normalize(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

// Splits raw import text into blocks: a "[Type]" header line followed by a question
// line and one or more option/answer lines; blank lines separate blocks.
// "@Name: value" lines before a header are batch metadata inherited by later blocks;
// the same lines directly after a block's answers (no blank line in between) apply
// only to that block, overriding the batch. Once a blank line has been seen after a
// block's answers, any further "@" lines are treated as batch metadata for later blocks.
function splitBlocks(rawText) {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let current = null;
  let blankSeenSinceContent = false;
  let batchMetadata = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // console.log(`line: "${line}"`);
    const headerMatch = line.match(HEADER_RE);

    if (headerMatch) {
      if (current) blocks.push(current);
      current = {
        rawType: headerMatch[1],
        lines: [],
        metadata: { ...batchMetadata },
      };
      blankSeenSinceContent = false;
      continue;
    }

    if (!line) {
      if (current) blankSeenSinceContent = true;
      continue;
    }

    const metadataMatch = line.match(METADATA_RE);
    if (metadataMatch) {
      const isPerQuestion = current && !blankSeenSinceContent;
      if (isPerQuestion) {
        current.metadata[metadataMatch[1].toLowerCase()] =
          metadataMatch[2].trim();
      } else {
        if (current) {
          blocks.push(current);
          current = null;
        }
        batchMetadata[metadataMatch[1].toLowerCase()] = metadataMatch[2].trim();
      }
      continue;
    }

    if (!current || blankSeenSinceContent) {
      if (current) blocks.push(current);
      current = null;
      blocks.push({ rawType: null, lines: [line], noHeader: true });
      continue;
    }

    current.lines.push(line);
  }

  if (current) blocks.push(current);
  return blocks;
}

function parseOptionLine(line) {
  const isCorrect = line.startsWith("*");
  const text = (isCorrect ? line.slice(1) : line).trim();
  return { text, isCorrect };
}

function buildQuestion(block, index) {
  const label = `Block ${index + 1}`;

  if (block.noHeader) {
    return { error: `${label}: content found before any [Type] header` };
  }

  const type = TYPE_ALIASES[block.rawType.toLowerCase()];
  if (!type) {
    return { error: `${label}: unknown question type "[${block.rawType}]"` };
  }

  const [questionLine, ...answerLines] = block.lines;
  if (!questionLine) {
    return { error: `${label} (${block.rawType}): missing question text` };
  }

  const prefix = `${label} ("${questionLine.slice(0, 60)}")`;
  const questionBankName = block.metadata?.questionbank;
  const withBank = (question) =>
    questionBankName ? { ...question, questionBankName } : question;

  if (answerLines.length === 0) {
    return { error: `${prefix}: no options/answers provided` };
  }

  if (type === "multiple-choice" || type === "multi-select") {
    const parsed = answerLines.map(parseOptionLine);
    const options = parsed.map((p) => p.text);
    const correctIndexes = parsed.reduce(
      (acc, p, i) => (p.isCorrect ? [...acc, i] : acc),
      [],
    );

    if (options.some((o) => !o)) {
      return { error: `${prefix}: options cannot be empty` };
    }
    if (options.length < 2) {
      return { error: `${prefix}: requires at least 2 options` };
    }
    if (correctIndexes.length === 0) {
      return { error: `${prefix}: no correct answer marked with *` };
    }

    if (type === "multiple-choice") {
      if (correctIndexes.length > 1) {
        return {
          error: `${prefix}: MultipleChoice must have exactly one correct answer`,
        };
      }
      return {
        question: withBank({
          type,
          question: questionLine,
          options,
          correctIndex: correctIndexes[0],
        }),
      };
    }

    return {
      question: withBank({
        type,
        question: questionLine,
        options,
        correctIndexes,
      }),
    };
  }

  if (type === "true-false") {
    if (answerLines.length !== 1) {
      return { error: `${prefix}: TrueFalse requires exactly one answer line` };
    }
    const { text } = parseOptionLine(answerLines[0]);
    const normalized = text.toLowerCase();
    if (normalized !== "true" && normalized !== "false") {
      return { error: `${prefix}: TrueFalse answer must be "True" or "False"` };
    }
    return {
      question: withBank({
        type,
        question: questionLine,
        correctAnswer: normalized === "true",
      }),
    };
  }

  // short-answer
  if (answerLines.length !== 1) {
    return { error: `${prefix}: ShortAnswer requires exactly one answer line` };
  }
  const { text, isCorrect } = parseOptionLine(answerLines[0]);
  if (!text) {
    return { error: `${prefix}: answer cannot be empty` };
  }
  return {
    question: withBank({ type, question: questionLine, correctAnswer: text }),
  };
}

// Parses the bulk-import text format into question payloads, collecting structural
// errors and duplicate question text found within the same import batch
function parseImportText(rawText) {
  const blocks = splitBlocks(rawText || "");
  if (blocks.length === 0) {
    return {
      questions: [],
      errors: ["No question blocks found in the provided text"],
    };
  }

  const errors = [];
  const questions = [];
  const seen = new Map();

  blocks.forEach((block, index) => {
    const result = buildQuestion(block, index);
    if (result.error) {
      errors.push(result.error);
      return;
    }

    const key = `${result.question.type}::${normalize(result.question.question)}`;
    if (seen.has(key)) {
      errors.push(
        `Block ${index + 1} ("${result.question.question.slice(0, 60)}"): duplicate of block ${seen.get(key) + 1} in this import`,
      );
      return;
    }
    seen.set(key, index);
    questions.push(result.question);
  });

  return { questions, errors };
}

module.exports = { parseImportText, normalize };
