const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});
function uploadImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must not exceed 5 MB'
        : 'Invalid image upload';
      return res.status(status).json({ error: message });
    }
    if (err) return next(err);
    next();
  });
}
module.exports = uploadImage;
