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
const derivativeSpecs = {
  working: { folder: 'working', maxEdge: 1440 },
  thumbnail: { folder: 'thumbnails', maxEdge: 360 }
};
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
function assetUrl(assetId, variant = 'working') { return 'app-media://asset/' + assetId + '?variant=' + encodeURIComponent(variant); }
function fileRecord(relpath, mime, role, state = 'ready', extra = {}) {
  return { role, state, relpath, mime, byteLength: extra.byteLength || 0, width: extra.width || 0, height: extra.height || 0, updatedAtUtc: nowIso(), errorCode: extra.errorCode || '' };
}
function safeFileStat(profileRoot, relpath) {
  try { return fs.statSync(path.join(profileRoot, relpath)); }
  catch { return null; }
}
function tryLoadNativeImage() {
  try { return require('electron')?.nativeImage || null; }
  catch { return null; }
}
function generateDerivative(profileRoot, originalPath, sha256, variant) {
  const spec = derivativeSpecs[variant];
  const relpath = portablePath('media', spec.folder, sha256 + '-' + variant + '.png');
  const fullPath = path.join(profileRoot, relpath);
  const nativeImage = tryLoadNativeImage();
  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    if (!nativeImage?.createFromBuffer) throw new Error('NATIVE_IMAGE_UNAVAILABLE');
    const image = nativeImage.createFromBuffer(fs.readFileSync(originalPath));
    if (!image || image.isEmpty()) throw new Error('DERIVATIVE_IMAGE_EMPTY');
    const size = image.getSize();
    const scale = Math.min(1, spec.maxEdge / Math.max(size.width || spec.maxEdge, size.height || spec.maxEdge));
    const target = image.resize({ width: Math.max(1, Math.round((size.width || spec.maxEdge) * scale)), height: Math.max(1, Math.round((size.height || spec.maxEdge) * scale)), quality: 'good' });
    if (!fs.existsSync(fullPath)) fs.writeFileSync(fullPath, target.toPNG());
    const stat = fs.statSync(fullPath);
    const finalSize = target.getSize();
    return fileRecord(relpath, 'image/png', variant, 'ready', { byteLength: stat.size, width: finalSize.width || 0, height: finalSize.height || 0 });
  } catch (error) {
    return fileRecord(relpath, 'image/png', variant, 'failed', { errorCode: error?.message || 'DERIVATIVE_FAILED' });
  }
}
function buildVariantRecords(profileRoot, asset) {
  const originalStat = safeFileStat(profileRoot, asset.originalRelpath);
  const variants = {
    ...(asset.variants || {}),
    original: fileRecord(asset.originalRelpath, asset.mime || asset.original_mime || 'application/octet-stream', 'original', originalStat ? 'ready' : 'missing', { byteLength: originalStat?.size || asset.byteLength || 0 })
  };
  if (originalStat) {
    const originalPath = path.join(profileRoot, asset.originalRelpath);
    Object.keys(derivativeSpecs).forEach((variant) => {
      const existing = variants[variant];
      if (existing?.state === 'ready' && fs.existsSync(path.join(profileRoot, existing.relpath))) return;
      variants[variant] = generateDerivative(profileRoot, originalPath, asset.sha256, variant);
    });
  }
  return variants;
}
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
      if (!asset) return;
      const fullPath = path.join(originalsRoot, fileName);
      const stat = fs.statSync(fullPath);
      const previous = index.assets[asset.assetId] || {};
      const next = {
        ...previous,
        ...asset,
        byteLength: previous.byteLength || stat.size,
        sourceType: previous.sourceType || 'recovered-original',
        createdAtUtc: previous.createdAtUtc || nowIso(),
        updatedAtUtc: nowIso()
      };
      next.variants = buildVariantRecords(profileRoot, next);
      index.assets[asset.assetId] = next;
      changed = true;
    });
  }
  if (changed) writeMediaIndex(profileRoot, index);
  return index;
}
function repairMediaIndex(profileRoot) {
  const index = ensureMediaIndexFromOriginals(profileRoot);
  let originals = 0;
  let workingReady = 0;
  let thumbnailReady = 0;
  let derivativeFailed = 0;
  Object.values(index.assets || {}).forEach((asset) => {
    originals += 1;
    asset.variants = buildVariantRecords(profileRoot, asset);
    if (asset.variants.working?.state === 'ready') workingReady += 1;
    if (asset.variants.thumbnail?.state === 'ready') thumbnailReady += 1;
    if (asset.variants.working?.state === 'failed') derivativeFailed += 1;
    if (asset.variants.thumbnail?.state === 'failed') derivativeFailed += 1;
  });
  writeMediaIndex(profileRoot, index);
  return { ok: true, originals, workingReady, thumbnailReady, derivativeFailed, updatedAtUtc: nowIso() };
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
      if (indexed) next = updateCaptureJob(profileRoot, id, { ...job, state: 'DURABLE', assetId, originalRelpath: indexed.originalRelpath, rendererSrc: assetUrl(assetId, 'working'), lastErrorCode: '' });
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
    const previous = index.assets[assetId] || {};
    const asset = {
      ...previous,
      assetId,
      sha256,
      originalRelpath,
      mime: detected.mime,
      byteLength: bytes.length,
      sourceType: request?.sourceType || 'unknown',
      createdAtUtc: previous.createdAtUtc || nowIso(),
      updatedAtUtc: nowIso()
    };
    asset.variants = buildVariantRecords(profileRoot, asset);
    index.assets[assetId] = asset;
    writeMediaIndex(profileRoot, index);
    const rendererSrc = assetUrl(assetId, 'working');
    const originalRendererSrc = assetUrl(assetId, 'original');
    const thumbnailSrc = assetUrl(assetId, 'thumbnail');
    const captureJob = updateCaptureJob(profileRoot, captureId, { state: 'DURABLE', assetId, sha256, originalRelpath, rendererSrc, imageObject: request?.imageObject || null, lastErrorCode: '' });
    return { assetId, sha256, originalRelpath, mime: detected.mime, byteLength: bytes.length, rendererSrc, originalRendererSrc, thumbnailSrc, variants: asset.variants, fsyncWarning, captureJob };
  } catch (error) {
    updateCaptureJob(profileRoot, captureId, { state: 'FAILED', lastErrorCode: error?.message || 'CAPTURE_COMMIT_FAILED' });
    throw error;
  }
}

function resolveAssetPath(profileRoot, assetId, variant = 'original') {
  const index = readMediaIndex(profileRoot);
  const asset = index.assets[String(assetId || '')];
  if (!asset) return null;
  const requested = ['original', 'working', 'thumbnail'].includes(String(variant)) ? String(variant) : 'original';
  const candidate = asset.variants?.[requested];
  const fallback = asset.variants?.original || { relpath: asset.originalRelpath, mime: asset.mime || 'application/octet-stream' };
  const selected = candidate?.state === 'ready' && candidate.relpath && fs.existsSync(path.join(profileRoot, candidate.relpath)) ? candidate : fallback;
  const fullPath = path.resolve(profileRoot, selected.relpath || asset.originalRelpath);
  const mediaRoot = path.resolve(profileRoot, 'media');
  if (!fullPath.startsWith(mediaRoot + path.sep)) return null;
  return { fullPath, mime: selected.mime || asset.mime || 'application/octet-stream', variant: selected.role || 'original', requestedVariant: requested, fallback: selected !== candidate };
}

module.exports = { commitDataUrl, resolveAssetPath, readCaptureJobs, updateCaptureJob, recoverCaptureJobs, repairMediaIndex, readMediaIndex };
