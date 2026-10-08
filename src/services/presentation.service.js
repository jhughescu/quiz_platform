const presentations = require("../config/presentations");
function getPresentations() {
  return Object.entries(presentations).map(([id, presentation]) => ({
    id,
    ...presentation
  }));
}
module.exports = {
  getPresentations
};