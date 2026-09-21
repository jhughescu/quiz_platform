const userRepository = require('../repositories/user.repository');
const userService = require('../services/user.service');

async function listUsers(req, res, next) {
  try {
    res.json(await userRepository.findAll());
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await userRepository.deleteById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, createUser, deleteUser };
