const mongoose = require('mongoose');
const { mongoUri } = require('./index');

async function connectDB() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file.');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
}

module.exports = connectDB;
