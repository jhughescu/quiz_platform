const templates = require("../config/templates");
function getTemplates() {
  return Object.entries(templates).map(([id, template]) => ({
    id,
    ...template
  }));
}
module.exports = {
  getTemplates
};