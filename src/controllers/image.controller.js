const Image = require('../models/Image');
const imageStorageService = require('../services/imageStorage.service');

async function getImage(req, res, next) {
  try {
    const image = await Image.findById(req.params.id).select('storageKey mimeType');
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const buffer = await imageStorageService.read(image.storageKey);
    res.set({
      'Content-Type': image.mimeType,
      'Content-Length': buffer.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400, immutable',
    });
    res.send(buffer);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Image not found' });
    }
    next(err);
  }
}

module.exports = { getImage };
