const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const signatures = [
  { mime: 'image/png', ext: 'png', test: (bytes) => bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  { mime: 'image/jpeg', ext: 'jpg', test: (bytes) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mime: 'image/gif', ext: 'gif', test: (bytes) => bytes.length > 6 && bytes.slice(0, 3).toString('ascii') === 'GIF' },
  { mime: 'image/webp', ext: 'webp', test: (bytes) => bytes.length > 12 && bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP' }
];

const captureStates = new Set(['QUEUED', 'RESOLVING', 'LOCALIZING', 'DURABLE', 'FAILED', 'ABANDONED']);
const incompleteStates = new Set(['QUEUED', 'RESOLVING', 'LOCALIZING']);
const extensionMime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
function portablePath(...parts) { return path.join(...parts).split(path.sep).join('/'); }

function nowIso() { return new Date().toISOString(); }
function mediaIndexPath(profileRoot) { return path.join(profileRoot, 'media', 'media-index.json'); }
function captureJobsPath(profileRoot) { return path.join(profileRoot, 'capture-jobs.json'); }
function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return fallback; }
}
function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
  fs.renameSync(tempPath, filePath);
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
function normalizeCaptureJob(job) {
  return {
    id: String(job?.id || ''),
    state: captureStates.has(job?.state) ? job.state : 'QUEUED',
    dayCanvasId: String(job?.dayCanvasId || job?.targetDayCanvasId || 'undated'),
    sourceType: String(job?.sourceType || 'unknown'),
    candidateManifest: job?.candidateManifest && typeof job.candidateManifest === 'object' ? job.candidateManifest : {},
    imageObject: job?.imageObject && typeof job.imageObject === 'object' ? job.imageObject : null,
    assetId: job?.assetId || '',
    sha256: job?.sha256 || '',
    originalRelpath: job?.originalRelpath || '',
    rendererSrc: job?.rendererSrc || '',
    lastErrorCode: job?.lastErrorCode || '',
    createdAtUtc: job?.createdAtUtc || nowIso(),
    updatedAtUtc: job?.updatedAtUtc || nowIso()
  };
}
function readCaptureJobs(profileRoot) {
  const value = readJson(captureJobsPath(profileRoot), { jobs: {} });
  const jobs = {};
  Object.entries(value.jobs || {}).forEach(([id, job]) => { jobs[id] = normalizeCaptureJob({ ...job, id }); });
  return { schemaVersion: 1, jobs };
}
function writeCaptureJobs(profileRoot, value) {
  writeJson(captureJobsPath(profileRoot), { schemaVersion: 1, jobs: value.jobs || {}, updatedAtUtc: nowIso() });
}
function updateCaptureJob(profileRoot, captureId, patch) {
  const id = String(captureId || ('capture-' + Date.now()));
  const queue = readCaptureJobs(profileRoot);
  const previous = queue.jobs[id] || { id, createdAtUtc: nowIso() };
  queue.jobs[id] = normalizeCaptureJob({ ...previous, ...patch, id, updatedAtUtc: nowIso(), createdAtUtc: previous.createdAtUtc || patch.createdAtUtc });
  writeCaptureJobs(profileRoot, queue);
  return queue.jobs[id];
}
function readMediaIndex(profileRoot) {
  const index = readJson(mediaIndexPath(profileRoot), { assets: {} });
  index.assets ||= {};
  return index;
}
function writeMediaIndex(profileRoot, index) { writeJson(mediaIndexPath(profileRoot), index); }
function assetFromOriginalFile(fileName) {
  const match = String(fileName || '').match(/^([a-f0-9]{64})\.(png|jpe?g|gif|webp)$/i);
  if (!match) return null;
  const sha256 = match[1].toLowerCase();
  const ext = match[2].toLowerCase();
  return { assetId: safeAssetId(sha256), sha256, originalRelpath: portablePath('media', 'originals', sha256 + '.' + ext), mime: extensionMime[ext] || 'application/octet-stream' };
}
function ensureMediaIndexFromOriginals(profileRoot) {
  const originalsRoot = path.join(profileRoot, 'media', 'originals');
  const index = readMediaIndex(profileRoot);
  let changed = false;
  if (fs.existsSync(originalsRoot)) {
    fs.readdirSync(originalsRoot).forEach((fileName) => {
      const asset = assetFromOriginalFile(fileName);
      if (!asset || index.assets[asset.assetId]) return;
      const fullPath = path.join(originalsRoot, fileName);
      const stat = fs.statSync(fullPath);
      index.assets[asset.assetId] = {
        ...asset,
        byteLength: stat.size,
        sourceType: 'recovered-original',
        createdAtUtc: nowIso(),
        updatedAtUtc: nowIso()
      };
      changed = true;
    });
  }
  if (changed) writeMediaIndex(profileRoot, index);
  return index;
}
function recoverCaptureJobs(profileRoot) {
  const queue = readCaptureJobs(profileRoot);
  const index = ensureMediaIndexFromOriginals(profileRoot);
  const stagingRoot = path.join(profileRoot, 'staging');
  const stagingParts = fs.existsSync(stagingRoot) ? fs.readdirSync(stagingRoot).filter((file) => file.endsWith('.part')) : [];
  const recovered = { durable: [], failed: [], abandoned: [], staging: stagingParts };
  Object.entries(queue.jobs).forEach(([id, job]) => {
    let next = job;
    if (job.sha256) {
      const assetId = job.assetId || safeAssetId(job.sha256);
      const indexed = index.assets[assetId];
      if (indexed) next = updateCaptureJob(profileRoot, id, { ...job, state: 'DURABLE', assetId, originalRelpath: indexed.originalRelpath, rendererSrc: 'app-media://asset/' + assetId + '?variant=original', lastErrorCode: '' });
    }
    if (incompleteStates.has(next.state)) {
      const hasStaging = stagingParts.includes(id + '.part');
      next = updateCaptureJob(profileRoot, id, { ...next, state: 'FAILED', lastErrorCode: hasStaging ? 'RECOVERED_STAGING_PART' : 'RECOVERED_INCOMPLETE_CAPTURE' });
    }
    if (next.state === 'DURABLE') recovered.durable.push(next);
    if (next.state === 'FAILED') recovered.failed.push(next);
    if (next.state === 'ABANDONED') recovered.abandoned.push(next);
  });
  return { ok: true, ...recovered, jobs: readCaptureJobs(profileRoot).jobs };
}

function commitDataUrl(profileRoot, request) {
  const captureId = String(request?.captureId || ('capture-' + Date.now()));
  updateCaptureJob(profileRoot, captureId, {
    state: 'QUEUED',
    dayCanvasId: request?.dayCanvasId || request?.boardDate || 'undated',
    sourceType: request?.sourceType || 'unknown',
    candidateManifest: request?.candidateManifest || {}
  });
  try {
    updateCaptureJob(profileRoot, captureId, { state: 'LOCALIZING' });
    const { declaredMime, bytes } = parseDataUrl(request?.dataUrl);
    if (bytes.length <= 0) throw new Error('MEDIA_EMPTY_BYTES');
    if (bytes.length > 25 * 1024 * 1024) throw new Error('MEDIA_TOO_LARGE');
    const detected = detectImage(bytes);
    if (declaredMime !== detected.mime) throw new Error('MEDIA_MIME_MAGIC_MISMATCH');
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const assetId = safeAssetId(sha256);
    const stagingPath = path.join(profileRoot, 'staging', captureId + '.part');
    const originalRelpath = portablePath('media', 'originals', sha256 + '.' + detected.ext);
    const originalPath = path.join(profileRoot, originalRelpath);
    fs.mkdirSync(path.dirname(stagingPath), { recursive: true });
    fs.mkdirSync(path.dirname(originalPath), { recursive: true });
    fs.writeFileSync(stagingPath, bytes);
    const fsyncWarning = fsyncFile(stagingPath);
    if (!fs.existsSync(originalPath)) fs.renameSync(stagingPath, originalPath);
    else fs.rmSync(stagingPath, { force: true });

    const index = readMediaIndex(profileRoot);
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
    writeMediaIndex(profileRoot, index);
    const rendererSrc = 'app-media://asset/' + assetId + '?variant=original';
    const captureJob = updateCaptureJob(profileRoot, captureId, { state: 'DURABLE', assetId, sha256, originalRelpath, rendererSrc, imageObject: request?.imageObject || null, lastErrorCode: '' });
    return { assetId, sha256, originalRelpath, mime: detected.mime, byteLength: bytes.length, rendererSrc, fsyncWarning, captureJob };
  } catch (error) {
    updateCaptureJob(profileRoot, captureId, { state: 'FAILED', lastErrorCode: error?.message || 'CAPTURE_COMMIT_FAILED' });
    throw error;
  }
}

function resolveAssetPath(profileRoot, assetId) {
  const index = readMediaIndex(profileRoot);
  const asset = index.assets[String(assetId || '')];
  if (!asset) return null;
  const fullPath = path.resolve(profileRoot, asset.originalRelpath);
  const originalsRoot = path.resolve(profileRoot, 'media', 'originals');
  if (!fullPath.startsWith(originalsRoot + path.sep)) return null;
  return { fullPath, mime: asset.mime || 'application/octet-stream' };
}

module.exports = { commitDataUrl, resolveAssetPath, readCaptureJobs, updateCaptureJob, recoverCaptureJobs };
