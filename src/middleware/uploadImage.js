const multer = require('multer');
const maxSizeMB = Number(process.env.IMAGE_MAX_SIZE_MB || 5);
if (!Number.isFinite(maxSizeMB) || maxSizeMB <= 0) {
  throw new Error('IMAGE_MAX_SIZE_MB must be a positive number');
}
const maxSizeBytes = maxSizeMB * 1024 * 1024;
console.log(`Image upload size limit: ${maxSizeMB} MB (${maxSizeBytes} bytes)`);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxSizeBytes,
    files: 1,
  },
});
function uploadImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? `Image must not exceed ${maxSizeMB} MB`
        : 'Invalid image upload';
      return res.status(status).json({ error: message });
    }
    if (err) return next(err);
    next();
  });
}
module.exports = uploadImage;