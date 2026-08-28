const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const signatures = [
  { mime: 'image/png', ext: 'png', test: (bytes) => bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  { mime: 'image/jpeg', ext: 'jpg', test: (bytes) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mime: 'image/gif', ext: 'gif', test: (bytes) => bytes.length > 6 && bytes.slice(0, 3).toString('ascii') === 'GIF' },
  { mime: 'image/webp', ext: 'webp', test: (bytes) => bytes.length > 12 && bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP' }
];

function nowIso() { return new Date().toISOString(); }
function mediaIndexPath(profileRoot) { return path.join(profileRoot, 'media', 'media-index.json'); }
function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return fallback; }
}
function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}
function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error('CAPTURE_INVALID_DATA_URL');
  return { declaredMime: match[1].toLowerCase(), bytes: Buffer.from(match[2], 'base64') };
}
function detectImage(bytes) {
  const signature = signatures.find((candidate) => candidate.test(bytes));
  if (!signature) throw new Error('MEDIA_UNSUPPORTED_MAGIC_BYTES');
  return signature;
}
function fsyncFile(filePath) {
  const handle = fs.openSync(filePath, 'r');
  try {
    fs.fsyncSync(handle);
    return null;
  } catch (error) {
    return error?.code || 'FSYNC_FAILED';
  } finally {
    fs.closeSync(handle);
  }
}
function safeAssetId(sha256) { return 'asset-' + sha256.slice(0, 24); }

function commitDataUrl(profileRoot, request) {
  const captureId = String(request?.captureId || ('capture-' + Date.now()));
  const { declaredMime, bytes } = parseDataUrl(request?.dataUrl);
  if (bytes.length <= 0) throw new Error('MEDIA_EMPTY_BYTES');
  if (bytes.length > 25 * 1024 * 1024) throw new Error('MEDIA_TOO_LARGE');
  const detected = detectImage(bytes);
  if (declaredMime !== detected.mime) throw new Error('MEDIA_MIME_MAGIC_MISMATCH');
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const assetId = safeAssetId(sha256);
  const stagingPath = path.join(profileRoot, 'staging', captureId + '.part');
  const originalRelpath = path.join('media', 'originals', sha256 + '.' + detected.ext).replace(/\\/g, '/');
  const originalPath = path.join(profileRoot, originalRelpath);
  fs.mkdirSync(path.dirname(stagingPath), { recursive: true });
  fs.mkdirSync(path.dirname(originalPath), { recursive: true });
  fs.writeFileSync(stagingPath, bytes);
  const fsyncWarning = fsyncFile(stagingPath);
  if (!fs.existsSync(originalPath)) fs.renameSync(stagingPath, originalPath);
  else fs.rmSync(stagingPath, { force: true });

  const indexPath = mediaIndexPath(profileRoot);
  const index = readJson(indexPath, { assets: {} });
  index.assets[assetId] = {
    assetId,
    sha256,
    originalRelpath,
    mime: detected.mime,
    byteLength: bytes.length,
    sourceType: request?.sourceType || 'unknown',
    createdAtUtc: index.assets[assetId]?.createdAtUtc || nowIso(),
    updatedAtUtc: nowIso()
  };
  writeJson(indexPath, index);
  return { assetId, sha256, originalRelpath, mime: detected.mime, byteLength: bytes.length, rendererSrc: 'app-media://asset/' + assetId + '?variant=original', fsyncWarning };
}

function resolveAssetPath(profileRoot, assetId) {
  const index = readJson(mediaIndexPath(profileRoot), { assets: {} });
  const asset = index.assets[String(assetId || '')];
  if (!asset) return null;
  const fullPath = path.resolve(profileRoot, asset.originalRelpath);
  const originalsRoot = path.resolve(profileRoot, 'media', 'originals');
  if (!fullPath.startsWith(originalsRoot + path.sep)) return null;
  return { fullPath, mime: asset.mime || 'application/octet-stream' };
}

module.exports = { commitDataUrl, resolveAssetPath };
