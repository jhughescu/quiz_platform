function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.message === "A one-at-a-time deployment must contain at least two questions") {
    return res.status(400).json({ error: err.message });
  }
  if (
    err.message === "Question already submitted" ||
    err.message === "Deployment references an invalid template" ||
    err.message === "Deployment references an invalid presentation"
  ) {
    return res.status(409).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal server error" });
}
module.exports = errorHandler;