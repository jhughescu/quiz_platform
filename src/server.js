const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config');

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Quiz app listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
