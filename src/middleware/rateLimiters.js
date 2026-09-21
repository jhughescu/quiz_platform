const rateLimit = require('express-rate-limit');

// Generous limit for read-only browsing of questions
const questionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Tighter limit since each submit writes to the database and could be used to brute-force answers
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions, please try again later.' }
});

module.exports = { questionsLimiter, submitLimiter };
