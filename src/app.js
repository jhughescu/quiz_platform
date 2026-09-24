const express = require('express');
const path = require('path');
const quizRoutes = require('./routes/quiz.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const deploymentRoutes = require('./routes/deployment.routes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', quizRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/users', userRoutes);
// app.use('/api/admin/deployments', deploymentRoutes);
app.use(errorHandler);

module.exports = app;
