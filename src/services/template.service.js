const fs = require("fs");
const path = require("path");
const templatesPath = path.join(__dirname, "../../public/quiz/templates");
function getTemplates() {
  const templates = [
    {
      id: "default",
      name: "Default",
      version: "1.0"
    }
  ];
  const overrides = fs.readdirSync(templatesPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      id: entry.name,
      name: entry.name,
      version: "1.0"
    }));
  return [...templates, ...overrides];
}
module.exports = {
  getTemplates
};