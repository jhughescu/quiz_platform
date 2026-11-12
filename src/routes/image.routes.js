const express = require('express');
const imageController = require('../controllers/image.controller');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.get('/:id', validateObjectId('id'), imageController.getImage);

module.exports = router;