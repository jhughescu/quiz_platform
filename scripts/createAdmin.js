// Creates (or updates the password/role for) a privileged user.
// Usage: npm run create-admin -- <email> <password> [admin|superuser]
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { mongoUri } = require('../src/config');
const User = require('../src/models/User');
const ROLES = require('../src/constants/roles');

async function run() {
  const [email, password, role] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password> [admin|superuser]');
    process.exit(1);
  }

  if (role && ![ROLES.ADMIN, ROLES.SUPERUSER].includes(role)) {
    console.error(`Invalid role "${role}". Must be "admin" or "superuser".`);
    process.exit(1);
  }

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file.');
  }

  await mongoose.connect(mongoUri);

  const passwordHash = await bcrypt.hash(password, 10);
  // Only touch `role` when explicitly passed, so re-running to change a password
  // never silently downgrades an existing user's role
  const result = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: { email: email.toLowerCase(), passwordHash, authProvider: 'local', ...(role ? { role } : {}) },
      $setOnInsert: role ? {} : { role: ROLES.ADMIN }
    },
    { upsert: true, returnDocument: 'after' }
  );

  console.log(`${result.role} user ready: ${email}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to create user:', err.message);
  process.exit(1);
});
