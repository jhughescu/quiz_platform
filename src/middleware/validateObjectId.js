const mongoose = require('mongoose');

// Rejects malformed ids early with 400 instead of letting Mongoose throw a CastError
function validateObjectId(paramName) {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[paramName])) {
      return res.status(400).json({ error: `Invalid ${paramName}` });
    }
    next();
  };
}

module.exports = validateObjectId;
