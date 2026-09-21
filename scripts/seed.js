// Populates the Question collection with sample quiz data.
// Usage: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri } = require('../src/config');
const { QUESTION_TYPES, Question } = require('../src/models/Question');

const sampleQuestions = [
  {
    type: QUESTION_TYPES.MULTIPLE_CHOICE,
    question: 'What does HTML stand for?',
    options: [
      'Hyper Trainer Marking Language',
      'HyperText Markup Language',
      'Hyper Text Markdown Language',
      'Hyperlink and Text Markup Language'
    ],
    correctIndex: 1
  },
  {
    type: QUESTION_TYPES.MULTIPLE_CHOICE,
    question: 'Which company developed Node.js?',
    options: ['Microsoft', 'Google', 'Joyent', 'Facebook'],
    correctIndex: 2
  },
  {
    type: QUESTION_TYPES.TRUE_FALSE,
    question: 'JavaScript and Java are the same language.',
    correctAnswer: false
  },
  {
    type: QUESTION_TYPES.MULTI_SELECT,
    question: 'Which of these are valid JavaScript variable declaration keywords?',
    options: ['var', 'let', 'const', 'def'],
    correctIndexes: [0, 1, 2]
  },
  {
    type: QUESTION_TYPES.SHORT_ANSWER,
    question: 'What is the default port used in this quiz app?',
    correctAnswer: '3000'
  }
];

async function seed() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file.');
  }

  await mongoose.connect(mongoUri);
  await Question.deleteMany({});
  await Question.insertMany(sampleQuestions);
  console.log(`Seeded ${sampleQuestions.length} questions.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
