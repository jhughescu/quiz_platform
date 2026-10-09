async function loadPresentation(id) {
  const presentationId = id || "default";
  return import(`/quiz/presentations/${encodeURIComponent(presentationId)}/presentation.js`);
}