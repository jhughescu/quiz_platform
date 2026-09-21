require('dotenv').config();

const mongoose = require('mongoose');

const deploymentService = require('../src/services/deployment.service');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log('Connected to MongoDB');

    const deployment = await deploymentService.createDeployment({
      name: 'Deployment Test',
      questionBankId: '6aac0e67b93afb3ede95ae12',
      template: {
        id: 'default',
        version: '1.0'
      },
      user: {
        sub: '6aa013e1ecc6d8ee6b674925',
        role: 'superuser'
      }
    });

    console.log('\nDeployment created:');
    console.dir(deployment.toObject(), { depth: null });
  } catch (err) {
    console.error('\nTest failed:');
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();