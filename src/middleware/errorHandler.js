function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.message === 'Question already submitted') {
    return res.status(409).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
}
module.exports = errorHandler;