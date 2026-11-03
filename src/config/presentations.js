const fs = require("fs");
const path = require("path");
const presentationsDirectory = path.join(
  __dirname,
  "../../public/quiz/presentations",
);

const presentations = {};
function validatePresentation(id, presentation) {
  if (
    !presentation ||
    typeof presentation !== "object" ||
    Array.isArray(presentation)
  ) {
    throw new Error(`Presentation "${id}" metadata must be a JSON object`);
  }
  if (typeof presentation.name !== "string" || !presentation.name.trim()) {
    throw new Error(`Presentation "${id}" must have a non-empty name`);
  }
  if (
    typeof presentation.version !== "string" ||
    !presentation.version.trim()
  ) {
    throw new Error(`Presentation "${id}" must have a non-empty version`);
  }
  if (!["all", "single"].includes(presentation.mode)) {
    throw new Error(
      `Presentation "${id}" has an invalid mode: "${presentation.mode}"`,
    );
  }
  if (typeof presentation.navigation !== "boolean") {
    throw new Error(
      `Presentation "${id}" must have a boolean navigation property`,
    );
  }
  if (typeof presentation.progress !== "boolean") {
    throw new Error(
      `Presentation "${id}" must have a boolean progress property`,
    );
  }
}
const directories = fs.readdirSync(presentationsDirectory, {
  withFileTypes: true,
});
for (const directory of directories) {
  if (!directory.isDirectory()) {
    continue;
  }
  const metadataPath = path.join(
    presentationsDirectory,
    directory.name,
    "presentation.json",
  );
  if (!fs.existsSync(metadataPath)) {
    throw new Error(
      `Missing presentation.json for presentation "${directory.name}"`,
    );
  }
  try {
    const presentation = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    validatePresentation(directory.name, presentation);
    presentations[directory.name] = presentation;
  } catch (err) {
    throw new Error(
      `Invalid presentation configuration for "${directory.name}": ${err.message}`,
    );
  }
}
module.exports = presentations;
