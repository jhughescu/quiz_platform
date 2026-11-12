const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const storageDirectory = process.env.IMAGE_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'images');
const mimeTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
function getFilePath(storageKey) {
  const validKey = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
  if (!validKey.test(storageKey)) {
    throw new Error('Invalid image storage key');
  }
  return path.join(storageDirectory, storageKey);
}
async function save(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Image data must be a buffer');
  }
  const extension = mimeTypes[mimeType];
  if (!extension) {
    throw new Error('Unsupported image type');
  }
  await fs.mkdir(storageDirectory, { recursive: true });
  const storageKey = `${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(getFilePath(storageKey), buffer);
  return storageKey;
}
async function read(storageKey) {
  return fs.readFile(getFilePath(storageKey));
}
async function remove(storageKey) {
  await fs.rm(getFilePath(storageKey), { force: true });
}
module.exports = { save, read, remove };