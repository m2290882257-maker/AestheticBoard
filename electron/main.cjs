const { app, BrowserWindow, ipcMain, screen, protocol, net, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { ensureMetadataStore, insertDurableCapture, saveWorkspaceSnapshot, loadWorkspaceSnapshot, rebuildSearchIndex, querySearchIndex, writeRetryQueue, readRetryQueue } = require('./persistence.cjs');
const { commitDataUrl, commitFilePath, previewRelinkFolder, commitRelinkMatches, resolveAssetPath, recoverCaptureJobs, repairMediaIndex, generateAssetDerivatives, readCaptureJobs, readMediaIndex } = require('./media-store.cjs');
const { validatePersistenceEnvelope } = require('./mutation-contract.cjs');
const { allowedImageMimeTypes, maxRemoteImageBytes, maxRedirects, fetchTimeoutMs, validateRemoteImageUrl, assertRemoteHostAllowed, mimeFromResponse, detectRemoteImageInfo, assertImageSizeAllowed, policySummary } = require('./remote-policy.cjs');
const { sanitizeExportFileName, fullDayBoundsError, exportPolicySummary } = require('./export-helpers.cjs');
const { defaultProviderConfig, sanitizeProviderConfig, generateKeywordCandidates, keywordProviderState, validateKeywordProviderRequest, providerDiagnosticsFromConfig, providerErrorCodes } = require('./keyword-gateway.cjs');
const { testProviderConnection } = require('./ai-provider-connectors.cjs');
const { validateImportPayload, mediaRefForImportItem, resolveImportMediaReferences: resolveImportMediaReferencesForIndex, matchedImportAsset } = require('./import-media-resolution.cjs');

const stateFileName = 'workspace-state.json';
const productProfileId = 'AestheticBoard';
const localDataDirectory = path.join(process.env.LOCALAPPDATA || app.getPath('appData'), productProfileId);
app.setPath('userData', localDataDirectory);
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('no-sandbox');
const profileFormatVersion = 1;
const profileDirectoryName = 'profile-v1';
const profileDirectories = [
  'media/originals',
  'media/working',
  'media/thumbnails',
  'staging',
  'cache',
  'logs',
  'exports'
];
let mainWindow = null;
let workspaceState = {
  bounds: { width: 1180, height: 820 },
  alwaysOnTop: false
};
let profileState = null;
let mediaProtocolRegistered = false;
let persistenceWorker = null;
let mediaRelinkBatchPreview = null;

class PersistenceWorker {
  constructor(rootProvider) {
    this.rootProvider = rootProvider;
    this.pendingEnvelope = null;
    this.pendingResolvers = [];
    this.timer = null;
    this.lastAck = { revision: 0, updatedAtUtc: null };
  }

  enqueue(envelope) {
    if (this.pendingEnvelope) {
      this.pendingEnvelope = { ...envelope, mutations: [...this.pendingEnvelope.mutations, ...envelope.mutations], snapshot: envelope.snapshot };
    } else {
      this.pendingEnvelope = envelope;
    }
    return new Promise((resolve) => {
      this.pendingResolvers.push(resolve);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 180);
    });
  }

  flush() {
    const envelope = this.pendingEnvelope;
    const resolvers = this.pendingResolvers.splice(0);
    this.pendingEnvelope = null;
    this.timer = null;
    let ack;
    try {
      ack = saveWorkspaceSnapshot(this.rootProvider(), envelope?.snapshot || {}, { mutations: envelope?.mutations || [] });
      this.lastAck = { revision: ack.revision, updatedAtUtc: ack.updatedAtUtc };
    } catch (error) {
      ack = { ok: false, error: error?.message || 'Persistence write failed', revision: this.lastAck.revision || 0, mutationIds: envelope?.mutations?.map((mutation) => mutation.id) || [] };
    }
    resolvers.forEach((resolve) => resolve(ack));
  }

  read() {
    const loaded = loadWorkspaceSnapshot(this.rootProvider());
    if (loaded?.ok) {
      loaded.captureRecovery = recoverCaptureJobs(this.rootProvider());
      loaded.retryMetadata = readRetryQueue(this.rootProvider());
      this.lastAck = { revision: Number(loaded.snapshot?.persistenceRevision || this.lastAck.revision || 0), updatedAtUtc: loaded.snapshot?.updatedAtUtc || this.lastAck.updatedAtUtc };
    }
    return loaded;
  }
}
function localDataRoot() {
  return localDataDirectory;
}

function statePath() {
  return path.join(localDataRoot(), stateFileName);
}

function profileRoot() {
  return path.join(localDataRoot(), profileDirectoryName);
}

function profileManifestPath() {
  return path.join(profileRoot(), 'profile.json');
}


function keywordProviderConfigPath() {
  return path.join(profileRoot(), 'keyword-provider-config.json');
}

function truthyEnv(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function providerConfigWithEnvironment(config) {
  const patch = { ...(config || {}) };
  const provider = process.env.AESTHETICBOARD_AI_PROVIDER;
  if (provider) patch.activeProvider = provider;
  if (truthyEnv(process.env.AESTHETICBOARD_EXTERNAL_AI_ENABLED)) {
    patch.externalProviderEnabled = true;
    patch.allowImageAccess = true;
    patch.allowTextAccess = true;
    patch.allowNetwork = true;
  }
  const qwenOptions = { ...((patch.providerOptions || {})['qwen3.7-flash'] || {}) };
  if (process.env.AESTHETICBOARD_QWEN_MODEL) qwenOptions.model = process.env.AESTHETICBOARD_QWEN_MODEL;
  if (process.env.AESTHETICBOARD_QWEN_BASE_URL) qwenOptions.baseUrl = process.env.AESTHETICBOARD_QWEN_BASE_URL;
  if (process.env.AESTHETICBOARD_QWEN_TIMEOUT_MS) qwenOptions.timeoutMs = Number(process.env.AESTHETICBOARD_QWEN_TIMEOUT_MS);
  patch.providerOptions = { ...(patch.providerOptions || {}), 'qwen3.7-flash': qwenOptions };
  return sanitizeProviderConfig(patch);
}

function readKeywordProviderConfig() {
  try {
    const filePath = keywordProviderConfigPath();
    const base = fs.existsSync(filePath) ? readJsonFile(filePath) || {} : defaultProviderConfig();
    return providerConfigWithEnvironment(base);
  } catch {
    return providerConfigWithEnvironment(defaultProviderConfig());
  }
}

function writeKeywordProviderConfig(config) {
  const sanitized = sanitizeProviderConfig({ ...config, updatedAtUtc: new Date().toISOString() });
  writeJsonFile(keywordProviderConfigPath(), sanitized);
  return sanitized;
}

function updateKeywordProviderConfig(request = {}) {
  const current = readKeywordProviderConfig();
  const provider = String(request.provider || request.activeProvider || current.activeProvider || 'local-mock');
  const patch = {
    ...current,
    activeProvider: provider,
    externalProviderEnabled: Boolean(request.externalProviderEnabled),
    allowImageAccess: Boolean(request.allowImageAccess),
    allowTextAccess: Boolean(request.allowTextAccess),
    allowNetwork: Boolean(request.allowNetwork),
    providerOptions: {
      ...(current.providerOptions || {}),
      ...(request.providerOptions && typeof request.providerOptions === 'object' ? request.providerOptions : {})
    }
  };
  const saved = writeKeywordProviderConfig(patch);
  return { ok: true, keywordProvider: keywordProviderState(saved), configPath: keywordProviderConfigPath() };
}

function keywordProviderDiagnostics() {
  const config = readKeywordProviderConfig();
  return { ok: true, diagnostics: providerDiagnosticsFromConfig(config), keywordProvider: keywordProviderState(config) };
}

async function testKeywordProvider(request = {}) {
  const config = readKeywordProviderConfig();
  const provider = String(request.provider || config.activeProvider || 'local-mock');
  const diagnostics = providerDiagnosticsFromConfig(config);
  const validation = validateKeywordProviderRequest({ provider, providerConfig: config });
  if (!validation.ok) return { ok: false, error: validation.error, diagnostics, keywordProvider: keywordProviderState(config) };
  if (provider === 'local-mock') return { ok: true, provider, diagnostics, keywordProvider: keywordProviderState(config), message: 'Local mock is available. No network request was made.' };
  const result = await testProviderConnection(provider, { providerConfig: config, profileRoot: profileRoot() });
  return { ...result, diagnostics: result?.diagnostics || diagnostics, keywordProvider: keywordProviderState(config) };
}

function dragHarnessLogPath() {
  return path.join(profileRoot(), 'logs', 'drag-harness.jsonl');
}

function readJsonFile(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return null; }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function ensureProfile() {
  const root = profileRoot();
  fs.mkdirSync(root, { recursive: true });
  profileDirectories.forEach((name) => fs.mkdirSync(path.join(root, name), { recursive: true }));
  const metadata = ensureMetadataStore(root);
  const captureRecovery = recoverCaptureJobs(root);
  const providerConfig = writeKeywordProviderConfig(readKeywordProviderConfig());
  const manifestPath = profileManifestPath();
  const existing = readJsonFile(manifestPath) || {};
  const manifest = {
    productId: 'aesthetic-board',
    profileFormatVersion,
    createdAtUtc: existing.createdAtUtc || new Date().toISOString(),
    updatedAtUtc: new Date().toISOString(),
    storage: {
      metadata: 'metadata.sqlite',
      mediaOriginals: 'media/originals',
      mediaWorking: 'media/working',
      mediaThumbnails: 'media/thumbnails',
      staging: 'staging',
      cache: 'cache',
      logs: 'logs',
      exports: 'exports'
    }
  };
  writeJsonFile(manifestPath, manifest);
  profileState = {
    ready: true,
    profileLabel: '%LOCALAPPDATA%/' + productProfileId + '/' + profileDirectoryName,
    profileFormatVersion,
    directories: profileDirectories.map((name) => ({ name, ready: fs.existsSync(path.join(root, name)) })),
    metadata,
    keywordProvider: keywordProviderState(providerConfig),
    manifestUpdatedAtUtc: manifest.updatedAtUtc
  };
  return profileState;
}

function safeProfileState() {
  if (profileState) return profileState;
  try { return ensureProfile(); }
  catch (error) {
    return {
      ready: false,
      profileLabel: '%LOCALAPPDATA%/' + productProfileId + '/' + profileDirectoryName,
      profileFormatVersion,
      directories: profileDirectories.map((name) => ({ name, ready: false })),
      keywordProvider: keywordProviderState(readKeywordProviderConfig()),
      error: error?.message || 'Profile unavailable'
    };
  }
}

function sanitizeProbe(probe) {
  const copy = { ...(probe || {}) };
  delete copy.html;
  delete copy.rawText;
  copy.recordedAtUtc = new Date().toISOString();
  return copy;
}

function readWorkspaceState() {
  try {
    const next = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    workspaceState = { ...workspaceState, ...next, bounds: { ...workspaceState.bounds, ...(next.bounds || {}) } };
  } catch {
    // First launch keeps the default window profile.
  }
}

function writeWorkspaceState() {
  try {
    fs.mkdirSync(localDataRoot(), { recursive: true });
    fs.writeFileSync(statePath(), JSON.stringify(workspaceState, null, 2));
  } catch {
    // Renderer state remains usable even when shell state cannot be written.
  }
}

function visibleBounds(bounds) {
  const displays = screen.getAllDisplays();
  const intersects = displays.some((display) => {
    const area = display.workArea;
    return bounds.x < area.x + area.width && bounds.x + bounds.width > area.x && bounds.y < area.y + area.height && bounds.y + bounds.height > area.y;
  });
  if (intersects) return bounds;
  const primary = screen.getPrimaryDisplay().workArea;
  return {
    ...bounds,
    x: primary.x + Math.round((primary.width - bounds.width) / 2),
    y: primary.y + Math.round((primary.height - bounds.height) / 2)
  };
}

function scheduleDerivativeBuild(assetId) {
  if (!assetId) return;
  setTimeout(() => {
    try { generateAssetDerivatives(profileRoot(), assetId); }
    catch (error) { console.warn('media derivative build failed', error?.message || error); }
  }, 0);
}

function mediaRequestFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'app-media:') return { assetId: '', variant: 'original' };
    let assetId = '';
    if (url.hostname === 'asset') assetId = decodeURIComponent(url.pathname.replace(/^\//, ''));
    else {
      const parts = url.pathname.split('/').filter(Boolean);
      const assetIndex = parts.indexOf('asset');
      assetId = assetIndex >= 0 ? decodeURIComponent(parts[assetIndex + 1] || '') : '';
    }
    return { assetId, variant: url.searchParams.get('variant') || 'original' };
  } catch {
    return { assetId: '', variant: 'original' };
  }
}


function defaultExportPath(filename, extension) {
  const safeName = sanitizeExportFileName(filename, extension);
  return path.join(app.getPath('documents'), safeName);
}
async function chooseExportPath(filename, extension, filters) {
  const result = await dialog.showSaveDialog(mainWindow || undefined, {
    title: 'Save AestheticBoard export',
    defaultPath: defaultExportPath(filename, extension),
    filters
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath.toLowerCase().endsWith(extension) ? result.filePath : result.filePath + extension;
}
async function writeExportJson(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  const content = String(request?.content || '');
  if (!content || content.length > 10 * 1024 * 1024) return { ok: false, error: 'INVALID_EXPORT_JSON' };
  try { JSON.parse(content); } catch { return { ok: false, error: 'EXPORT_JSON_PARSE_FAILED' }; }
  const filePath = await chooseExportPath(request?.filename, '.json', [{ name: 'JSON', extensions: ['json'] }]);
  if (!filePath) return { ok: false, canceled: true, error: 'Export canceled' };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true, filePath, fileName: path.basename(filePath), byteLength: Buffer.byteLength(content, 'utf8') };
}
async function captureViewportPng(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: 'WINDOW_UNAVAILABLE' };
  const filePath = await chooseExportPath(request?.filename, '.png', [{ name: 'PNG Image', extensions: ['png'] }]);
  if (!filePath) return { ok: false, canceled: true, error: 'Export canceled' };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const image = await mainWindow.webContents.capturePage();
  const buffer = image.toPNG();
  fs.writeFileSync(filePath, buffer);
  return { ok: true, filePath, fileName: path.basename(filePath), byteLength: buffer.length };
}
async function captureFullDayPng(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: 'WINDOW_UNAVAILABLE' };
  const bounds = request?.bounds || {};
  const width = Number(bounds.width || 0);
  const height = Number(bounds.height || 0);
  const boundsError = fullDayBoundsError(bounds);
  if (boundsError) return { ok: false, error: boundsError };
  const filePath = await chooseExportPath(request?.filename, '.png', [{ name: 'PNG Image', extensions: ['png'] }]);
  if (!filePath) return { ok: false, canceled: true, error: 'Export canceled' };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const image = await mainWindow.webContents.capturePage();
  const buffer = image.toPNG();
  fs.writeFileSync(filePath, buffer);
  return { ok: true, filePath, fileName: path.basename(filePath), byteLength: buffer.length, sourceBounds: { width, height } };
}
async function fetchRemoteImageDataUrl(url) {
  let currentUrl = validateRemoteImageUrl(url);
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertRemoteHostAllowed(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
    let response;
    try {
      response = await net.fetch(currentUrl.toString(), { redirect: 'manual', signal: controller.signal });
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('REMOTE_FETCH_TIMEOUT');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('REMOTE_REDIRECT_WITHOUT_LOCATION');
      currentUrl = validateRemoteImageUrl(new URL(location, currentUrl).toString());
      continue;
    }
    if (!response.ok) throw new Error('REMOTE_FETCH_' + response.status);
    const mime = mimeFromResponse(response);
    if (mime && !allowedImageMimeTypes.has(mime)) throw new Error('REMOTE_UNSUPPORTED_TYPE');
    const lengthHeader = Number(response.headers.get('content-length') || 0);
    if (lengthHeader > maxRemoteImageBytes) throw new Error('REMOTE_IMAGE_TOO_LARGE');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error('REMOTE_EMPTY_BODY');
    if (bytes.length > maxRemoteImageBytes) throw new Error('REMOTE_IMAGE_TOO_LARGE');
    const info = detectRemoteImageInfo(bytes);
    assertImageSizeAllowed(info);
    if (mime && mime !== info.mime) throw new Error('REMOTE_MIME_MAGIC_MISMATCH');
    return { dataUrl: 'data:' + info.mime + ';base64,' + bytes.toString('base64'), byteLength: bytes.length, mime: info.mime, width: info.width || 0, height: info.height || 0, finalUrl: response.url || currentUrl.toString() };
  }
  throw new Error('REMOTE_TOO_MANY_REDIRECTS');
}
function safeRelinkRefs(refs) {
  return (Array.isArray(refs) ? refs : []).slice(0, 200).map((ref) => ({
    objectId: String(ref?.objectId || '').slice(0, 180),
    importedFromId: String(ref?.importedFromId || '').slice(0, 180),
    sha256: String(ref?.sha256 || '').toLowerCase().slice(0, 128),
    dayCanvasId: String(ref?.dayCanvasId || '').slice(0, 80),
    imageObject: ref?.imageObject && typeof ref.imageObject === 'object' ? ref.imageObject : {}
  })).filter((ref) => ref.objectId && ref.sha256);
}

async function previewMediaRelinkBatch(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'PROFILE_UNAVAILABLE' };
  const refs = safeRelinkRefs(request?.refs);
  if (!refs.length) return { ok: false, error: 'NO_MISSING_MEDIA_REFS' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose folder with original images',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true, error: 'Batch relink canceled' };
  try {
    const preview = previewRelinkFolder(result.filePaths[0], refs);
    const previewId = 'media-relink-preview-' + Date.now();
    mediaRelinkBatchPreview = { id: previewId, matches: preview.matches, createdAtUtc: new Date().toISOString() };
    return { ...preview, previewId, matches: preview.matches.map((match) => ({ objectId: match.objectId, importedFromId: match.importedFromId, sha256: match.sha256, fileName: match.fileName })), folderPath: undefined };
  } catch (error) {
    return { ok: false, error: error?.message || 'MEDIA_RELINK_PREVIEW_FAILED' };
  }
}

function applyMediaRelinkBatch(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'PROFILE_UNAVAILABLE' };
  if (!mediaRelinkBatchPreview || mediaRelinkBatchPreview.id !== request?.previewId) return { ok: false, error: 'MEDIA_RELINK_PREVIEW_EXPIRED' };
  try {
    const result = commitRelinkMatches(profileRoot(), mediaRelinkBatchPreview.matches);
    mediaRelinkBatchPreview = null;
    return result;
  } catch (error) {
    return { ok: false, error: error?.message || 'MEDIA_RELINK_BATCH_FAILED' };
  }
}

async function relinkImportedMedia(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'PROFILE_UNAVAILABLE' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose replacement image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true, error: 'Relink canceled' };
  try {
    const committed = commitFilePath(profileRoot(), {
      captureId: request?.captureId || 'relink-' + Date.now(),
      dayCanvasId: request?.dayCanvasId || request?.boardDate || 'undated',
      boardDate: request?.boardDate || request?.dayCanvasId || 'undated',
      sourceType: 'import-media-relink',
      filePath: result.filePaths[0],
      expectedSha256: request?.expectedSha256 || '',
      imageObject: request?.imageObject || {},
      candidateManifest: { importedFromId: request?.importedFromId || '', repairOf: request?.objectId || '' }
    });
    return { ok: true, ...committed, fileName: path.basename(result.filePaths[0]) };
  } catch (error) {
    return { ok: false, error: error?.message || 'MEDIA_RELINK_FAILED' };
  }
}

async function localizeRemoteImage(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'PROFILE_UNAVAILABLE' };
  try {
    const remote = await fetchRemoteImageDataUrl(request?.url);
    const candidateManifest = { ...(request?.candidateManifest || {}), sourceUrl: request?.url || '', finalUrl: remote.finalUrl, byteLength: remote.byteLength, mime: remote.mime };
    const committed = commitDataUrl(profileRoot(), { ...(request || {}), sourceType: request?.sourceType || 'remote-url', dataUrl: remote.dataUrl, candidateManifest });
    const persistence = insertDurableCapture(profileRoot(), {
      captureJobId: request?.captureId || committed.assetId,
      dayCanvasId: request?.dayCanvasId || request?.boardDate || 'undated',
      boardDate: request?.boardDate || request?.dayCanvasId || 'undated',
      sourceType: request?.sourceType || 'remote-url',
      candidateManifest,
      assetId: committed.assetId,
      sha256: committed.sha256,
      originalRelpath: committed.originalRelpath,
      mime: committed.mime,
      byteLength: committed.byteLength,
      width: request?.pixelWidth || 0,
      height: request?.pixelHeight || 0,
      imageObject: request?.imageObject || {}
    });
    scheduleDerivativeBuild(committed.assetId);
    return { ok: true, ...committed, persistence, captureJob: committed.captureJob, finalUrl: remote.finalUrl };
  } catch (error) {
    if (request?.captureId) updateCaptureJob(profileRoot(), request.captureId, { state: 'FAILED', dayCanvasId: request?.dayCanvasId || request?.boardDate || 'undated', sourceType: request?.sourceType || 'remote-url', candidateManifest: { sourceUrl: request?.url || '' }, imageObject: request?.imageObject || null, lastErrorCode: error?.message || 'REMOTE_LOCALIZE_FAILED' });
    return { ok: false, error: error?.message || 'REMOTE_LOCALIZE_FAILED' };
  }
}
function sanitizeFixtureSnapshot(snapshot) {
  const clean = JSON.parse(JSON.stringify(snapshot || {}, (key, value) => {
    if (['pendingMutationIds', 'mutationError', 'pendingDataUrl'].includes(key)) return undefined;
    if (typeof value === 'string' && /^[a-z]:\\|^\\\\/i.test(value)) return '';
    return value;
  }));
  Object.values(clean.days || {}).forEach((day) => {
    (day.items || []).forEach((item) => { if (item.originalRelpath) item.src = item.assetId ? "app-media://asset/" + item.assetId + "?variant=working" : item.src; });
    (day.trash || []).forEach((entry) => { if (entry.item?.originalRelpath && entry.item.assetId) entry.item.src = "app-media://asset/" + entry.item.assetId + "?variant=working"; });
  });
  return clean;
}
function sanitizedMediaAssetsForExport() {
  const mediaIndex = readMediaIndex(profileRoot());
  return Object.values(mediaIndex.assets || {}).map((asset) => ({
    assetId: asset.assetId,
    sha256: asset.sha256,
    originalRelpath: asset.originalRelpath,
    variants: asset.variants ? Object.fromEntries(Object.entries(asset.variants).map(([key, record]) => [key, { role: record.role, state: record.state, relpath: record.relpath, mime: record.mime, byteLength: record.byteLength || 0 }])) : {}
  }));
}
function sanitizedCaptureJobsForExport() {
  const captureJobs = readCaptureJobs(profileRoot());
  return Object.values(captureJobs.jobs || {}).map((job) => ({ id: job.id, state: job.state, dayCanvasId: job.dayCanvasId, sourceType: job.sourceType, assetId: job.assetId || "", sha256: job.sha256 || "", originalRelpath: job.originalRelpath || "", lastErrorCode: job.lastErrorCode || "" }));
}
function buildRestoreFixture(snapshot) {
  return {
    schemaVersion: 1,
    product: 'AestheticBoard',
    fixtureType: 'restore-harness',
    exportedAtUtc: new Date().toISOString(),
    snapshot: sanitizeFixtureSnapshot(snapshot),
    mediaAssets: sanitizedMediaAssetsForExport(),
    captureJobs: sanitizedCaptureJobsForExport(),
    scenarios: ["snapshot-interruption", "staging-residue", "durable-media", "failed-capture-job"]
  };
}
function buildProfileBackup(snapshot) {
  const cleanSnapshot = sanitizeFixtureSnapshot(snapshot);
  const days = Object.values(cleanSnapshot.days || {});
  return {
    schemaVersion: 1,
    product: 'AestheticBoard',
    backupType: 'profile-backup',
    exportedAtUtc: new Date().toISOString(),
    includes: ['days', 'board objects', 'trash', 'media references', 'capture jobs', 'retry metadata', 'search metadata'],
    summary: {
      activeDayId: cleanSnapshot.activeDayId || '',
      revision: Number(cleanSnapshot.persistenceRevision || 0),
      days: days.length,
      objects: days.reduce((sum, day) => sum + (day.items || []).length, 0),
      trash: days.reduce((sum, day) => sum + (day.trash || []).length, 0),
      mediaAssets: sanitizedMediaAssetsForExport().length,
      captureJobs: sanitizedCaptureJobsForExport().length,
      retryQueue: readRetryQueue(profileRoot()).queue.length
    },
    snapshot: cleanSnapshot,
    mediaAssets: sanitizedMediaAssetsForExport(),
    captureJobs: sanitizedCaptureJobsForExport(),
    retryMetadata: readRetryQueue(profileRoot()),
    searchMetadata: { source: 'rebuildable-from-snapshot', absolutePathsIncluded: false }
  };
}
async function exportProfileBackup(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  const filePath = await chooseExportPath('aesthetic-board-profile-backup-' + Date.now() + '.json', '.json', [{ name: 'AestheticBoard Backup JSON', extensions: ['json'] }]);
  if (!filePath) return { ok: false, canceled: true, error: 'Export canceled' };
  const backup = buildProfileBackup(request?.snapshot || loadWorkspaceSnapshot(profileRoot())?.snapshot || {});
  const content = JSON.stringify(backup, null, 2);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true, filePath, fileName: path.basename(filePath), byteLength: Buffer.byteLength(content, 'utf8'), summary: backup.summary, includes: backup.includes };
}
async function exportRestoreFixture(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  const filePath = await chooseExportPath('aesthetic-board-restore-fixture-' + Date.now() + '.json', '.json', [{ name: 'Restore Fixture JSON', extensions: ['json'] }]);
  if (!filePath) return { ok: false, canceled: true, error: 'Export canceled' };
  const fixture = buildRestoreFixture(request?.snapshot || loadWorkspaceSnapshot(profileRoot())?.snapshot || {});
  const content = JSON.stringify(fixture, null, 2);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true, filePath, fileName: path.basename(filePath), byteLength: Buffer.byteLength(content, "utf8"), scenarios: fixture.scenarios };
}
function verifyRestoreProfile() {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  const loaded = loadWorkspaceSnapshot(profileRoot());
  const snapshot = loaded?.snapshot || {};
  const days = Object.values(snapshot.days || {});
  const mediaIndex = readMediaIndex(profileRoot());
  const captureJobs = readCaptureJobs(profileRoot());
  const jobs = Object.values(captureJobs.jobs || {});
  const result = {
    ok: true,
    source: loaded?.source || "none",
    revision: Number(snapshot.persistenceRevision || 0),
    activeDayId: snapshot.activeDayId || "",
    days: days.length,
    objects: days.reduce((sum, day) => sum + (day.items || []).length, 0),
    trash: days.reduce((sum, day) => sum + (day.trash || []).length, 0),
    mediaAssets: Object.keys(mediaIndex.assets || {}).length,
    captureJobs: jobs.length,
    failedCaptureJobs: jobs.filter((job) => job.state === 'FAILED').length,
    incompleteCaptureJobs: jobs.filter((job) => ['QUEUED', 'RESOLVING', 'LOCALIZING'].includes(job.state)).length,
    retryQueue: readRetryQueue(profileRoot()).queue.length,
    checkedAtUtc: new Date().toISOString()
  };
  return result;
}
function safeImportString(value, limit = 20000) {
  return String(value || '').slice(0, limit);
}

function resolveImportMediaReferences(validation) {
  return resolveImportMediaReferencesForIndex(validation, readMediaIndex(profileRoot()));
}

function sanitizeImportedItem(item, suffix, index, mediaResolution = null) {
  const kind = item?.kind === 'link' ? 'link' : 'image';
  const idBase = safeImportString(item?.id || kind + '-' + index, 120).replace(/[^0-9a-z_-]/gi, '-');
  const imported = {
    id: 'import-' + Date.now() + '-' + index + '-' + idBase,
    kind,
    x: Number.isFinite(Number(item?.x)) ? Number(item.x) + 36 : 160 + index * 24,
    y: Number.isFinite(Number(item?.y)) ? Number(item.y) + 36 : 160 + index * 24,
    width: Math.max(80, Math.min(Number(item?.width || 240), 720)),
    z: Number(item?.z || index + 1),
    locked: Boolean(item?.locked),
    note: safeImportString(item?.note, 5000),
    keywords: Array.isArray(item?.keywords) ? item.keywords.slice(0, 12).map((keyword) => safeImportString(keyword, 140)) : [],
    keywordCandidates: Array.isArray(item?.keywordCandidates) ? item.keywordCandidates.slice(0, 32).map((candidate, candidateIndex) => ({ id: safeImportString(candidate?.id || "import-candidate-" + candidateIndex, 180), text: safeImportString(candidate?.text, 140), confidence: Number(candidate?.confidence || 0), source: safeImportString(candidate?.source || candidate?.provider || "local-mock", 80), provider: safeImportString(candidate?.provider || candidate?.source || "local-mock", 80), state: safeImportString(candidate?.state || "suggested", 40), createdAtUtc: safeImportString(candidate?.createdAtUtc || candidate?.generatedAtUtc, 80), reviewedAtUtc: safeImportString(candidate?.reviewedAtUtc, 80), acceptedAtUtc: safeImportString(candidate?.acceptedAtUtc, 80), dismissedAtUtc: safeImportString(candidate?.dismissedAtUtc, 80), pinnedAtUtc: safeImportString(candidate?.pinnedAtUtc, 80) })).filter((candidate) => candidate.text) : [],
    aiKeywordState: safeImportString(item?.aiKeywordState || "idle", 80),
    lifecycleState: safeImportString(item?.lifecycleState || (kind === 'link' ? 'REFERENCE' : 'REMOTE_REFERENCE'), 80),
    sourceType: safeImportString(item?.sourceType || 'import', 120),
    sourceUrl: safeImportString(item?.sourceUrl, 2000),
    url: safeImportString(item?.url, 2000),
    label: safeImportString(item?.label, 200),
    assetId: safeImportString(item?.assetId, 180),
    sha256: safeImportString(item?.sha256, 128),
    originalRelpath: safeImportString(item?.originalRelpath || item?.media?.originalRelpath, 500),
    mediaRepairState: safeImportString(item?.mediaRepairState || "", 80)
  };
  const mediaMatch = matchedImportAsset(item, mediaResolution);
  if (mediaMatch) {
    imported.assetId = mediaMatch.matchedAssetId || imported.assetId;
    imported.sha256 = mediaMatch.matchedSha256 || imported.sha256;
    imported.originalRelpath = mediaMatch.matchedOriginalRelpath || imported.originalRelpath;
    imported.lifecycleState = 'DURABLE';
    imported.mediaResolution = 'matched-local';
  } else if (mediaRefForImportItem(item)) {
    imported.assetId = '';
    imported.originalRelpath = '';
    imported.lifecycleState = kind === 'link' ? 'REFERENCE' : 'REMOTE_REFERENCE';
    imported.mediaResolution = 'missing-reference';
    imported.mediaRepairState = 'needed';
  } else {
    imported.mediaResolution = kind === 'link' ? 'not-needed' : 'unsupported-reference';
    imported.mediaRepairState = kind === 'link' ? '' : 'needed';
  }
  if (imported.assetId) {
    imported.src = 'app-media://asset/' + imported.assetId + '?variant=working';
    imported.originalSrc = 'app-media://asset/' + imported.assetId + '?variant=original';
    imported.thumbnailSrc = 'app-media://asset/' + imported.assetId + '?variant=thumbnail';
  } else if (item?.src && !String(item.src).startsWith('app-media://asset/') && !/^[a-z]:\\|^\\\\/i.test(String(item.src))) {
    imported.src = safeImportString(item.src, 2000);
  }
  imported.importedFromId = safeImportString(item?.id, 160);
  imported.importBatchId = suffix;
  return imported;
}

function sanitizeImportedTrash(entry, suffix, index, mediaResolution = null) {
  const imported = { ...entry, trashId: 'import-trash-' + Date.now() + '-' + index, importedAtUtc: new Date().toISOString() };
  if (entry?.item) imported.item = sanitizeImportedItem(entry.item, suffix, index, mediaResolution);
  return imported;
}

function previewImportPayload(payload, fileName = '') {
  const validation = validateImportPayload(payload);
  if (!validation.ok) return validation;
  const mediaResolution = resolveImportMediaReferences(validation);
  const mediaRefs = mediaResolution.refs;
  const unsupportedFields = new Set();
  validation.items.forEach((item) => Object.keys(item || {}).forEach((key) => {
    if (!['id','kind','x','y','width','z','locked','note','keywords','lifecycleState','sourceType','sourceUrl','url','label','assetId','sha256','originalRelpath','media','src'].includes(key)) unsupportedFields.add(key);
  }));
  return {
    ok: true,
    fileName,
    title: validation.day.title || 'Imported day',
    items: validation.items.length,
    trash: validation.trash.length,
    mediaRefs,
    mediaResolution,
    unsupportedFields: [...unsupportedFields].slice(0, 20)
  };
}

async function chooseImportJson() {
  const result = await dialog.showOpenDialog(mainWindow || undefined, {
    title: 'Import AestheticBoard JSON',
    filters: [{ name: 'AestheticBoard JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.length > 10 * 1024 * 1024) return { ok: false, error: 'IMPORT_FILE_TOO_LARGE' };
  try { return { ok: true, filePath, fileName: path.basename(filePath), payload: JSON.parse(content) }; }
  catch { return { ok: false, error: 'IMPORT_JSON_PARSE_FAILED', fileName: path.basename(filePath) }; }
}

async function previewImportJson() {
  const chosen = await chooseImportJson();
  if (chosen.canceled) return { ok: false, canceled: true, error: 'Import canceled' };
  if (!chosen.ok) return chosen;
  return { ...previewImportPayload(chosen.payload, chosen.fileName), filePath: chosen.filePath };
}

async function importJsonAsNewDay() {
  const chosen = await chooseImportJson();
  if (chosen.canceled) return { ok: false, canceled: true, error: 'Import canceled' };
  if (!chosen.ok) return chosen;
  const validation = validateImportPayload(chosen.payload);
  if (!validation.ok) return validation;
  const loaded = loadWorkspaceSnapshot(profileRoot());
  const snapshot = loaded?.snapshot || { activeDayId: new Date().toISOString().slice(0, 10), surface: 'quiet', days: {} };
  snapshot.days ||= {};
  const mediaResolution = resolveImportMediaReferences(validation);
  const suffix = 'import-' + new Date().toISOString().slice(0, 10) + '-' + Date.now();
  const dayId = suffix;
  snapshot.days[dayId] = {
    title: validation.day.title ? 'Imported - ' + validation.day.title : 'Imported day',
    camera: { x: 0, y: 0, zoom: 1, ...(validation.day.camera || {}) },
    pasteSequence: Number(validation.day.pasteSequence || 0),
    items: validation.items.map((item, index) => sanitizeImportedItem(item, suffix, index, mediaResolution)),
    trash: validation.trash.map((entry, index) => sanitizeImportedTrash(entry, suffix, index, mediaResolution))
  };
  snapshot.activeDayId = dayId;
  const ack = saveWorkspaceSnapshot(profileRoot(), snapshot, { mutations: [{ id: 'import-' + Date.now(), type: 'day.import', targetId: dayId, dayCanvasId: dayId, createdAtUtc: new Date().toISOString(), payload: { fileName: chosen.fileName, mode: 'new-day' } }] });
  return { ok: true, dayId, title: snapshot.days[dayId].title, fileName: chosen.fileName, items: snapshot.days[dayId].items.length, trash: snapshot.days[dayId].trash.length, mediaResolution, revision: ack.revision };
}

function registerMediaProtocol() {
  if (mediaProtocolRegistered) return;
  mediaProtocolRegistered = true;
  protocol.handle('app-media', async (request) => {
    const state = safeProfileState();
    if (!state.ready) return new Response('Profile unavailable', { status: 503 });
    const mediaRequest = mediaRequestFromUrl(request.url);
    const asset = resolveAssetPath(profileRoot(), mediaRequest.assetId, mediaRequest.variant);
    if (!asset) return new Response('Asset not found', { status: 404 });
    return net.fetch(pathToFileURL(asset.fullPath).toString());
  });
}

function createWindow() {
  readWorkspaceState();
  safeProfileState();
  const bounds = visibleBounds(workspaceState.bounds);
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 960,
    minHeight: 640,
    title: 'Aesthetic Board',
    backgroundColor: '#f4f1e9',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(Boolean(workspaceState.alwaysOnTop));
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  const rememberBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.isMinimized() && !mainWindow.isFullScreen()) {
      workspaceState.bounds = mainWindow.getBounds();
      writeWorkspaceState();
    }
  };
  mainWindow.on('resize', rememberBounds);
  mainWindow.on('move', rememberBounds);
  mainWindow.on('close', rememberBounds);
}

app.whenReady().then(() => {
  registerMediaProtocol();
  createWindow();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('workspace:get-shell-state', () => ({ alwaysOnTop: Boolean(workspaceState.alwaysOnTop) }));
ipcMain.handle('workspace:set-always-on-top', (_event, value) => {
  workspaceState.alwaysOnTop = Boolean(value);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(workspaceState.alwaysOnTop);
  writeWorkspaceState();
  return { alwaysOnTop: workspaceState.alwaysOnTop };
});
ipcMain.handle('profile:get-state', () => safeProfileState());
ipcMain.handle('search:query', (_event, request) => {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable', results: [] };
  return querySearchIndex(profileRoot(), request?.query || '', request?.limit || 80);
});
ipcMain.handle('search:rebuild', () => {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  const loaded = loadWorkspaceSnapshot(profileRoot());
  return rebuildSearchIndex(profileRoot(), loaded?.snapshot || {});
});
ipcMain.handle('persistence:write-retry-queue', (_event, request) => {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  return writeRetryQueue(profileRoot(), request?.queue || [], request?.retrySequence || 0);
});
ipcMain.handle('import:preview-json', () => previewImportJson());
ipcMain.handle('import:as-new-day', () => importJsonAsNewDay());
ipcMain.handle('media:repair-index', () => {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  try {
    const repair = repairMediaIndex(profileRoot());
    profileState = { ...safeProfileState(), mediaRepair: repair };
    return repair;
  } catch (error) {
    return { ok: false, error: error?.message || 'MEDIA_REPAIR_FAILED' };
  }
});
ipcMain.handle('persistence:load-snapshot', () => {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  if (!persistenceWorker) persistenceWorker = new PersistenceWorker(profileRoot);
  return persistenceWorker.read();
});
ipcMain.handle('persistence:save-mutations', (_event, request) => {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  const validation = validatePersistenceEnvelope(request);
  if (!validation.ok) {
    return { ok: false, error: 'INVALID_MUTATION_ENVELOPE', details: validation.error, mutationIds: Array.isArray(request?.mutations) ? request.mutations.map((mutation) => String(mutation?.id || '')).filter(Boolean) : [] };
  }
  if (!persistenceWorker) persistenceWorker = new PersistenceWorker(profileRoot);
  return persistenceWorker.enqueue(validation.envelope).then((ack) => {
    const conflict = ack?.ok && Number(validation.envelope.baseRevision || 0) < Math.max(0, Number(ack.revision || 0) - 1);
    return { ...ack, conflict, conflictMessage: conflict ? "Base revision was older than the latest saved revision" : "" };
  });
});

ipcMain.handle('export:write-json', (_event, request) => writeExportJson(request));
ipcMain.handle('export:capture-viewport-png', (_event, request) => captureViewportPng(request));
ipcMain.handle('export:capture-full-day-png', (_event, request) => captureFullDayPng(request));
ipcMain.handle('diagnostics:export-restore-fixture', (_event, request) => exportRestoreFixture(request));
ipcMain.handle('backup:export-profile', (_event, request) => exportProfileBackup(request));
ipcMain.handle('keyword:get-provider-state', () => keywordProviderState(readKeywordProviderConfig()));
ipcMain.handle('keyword:get-provider-diagnostics', () => keywordProviderDiagnostics());
ipcMain.handle('keyword:set-provider-config', (_event, request) => updateKeywordProviderConfig(request));
ipcMain.handle('keyword:test-provider', (_event, request) => testKeywordProvider(request));
ipcMain.handle('keyword:validate-provider', (_event, request) => validateKeywordProviderRequest({ ...(request || {}), providerConfig: readKeywordProviderConfig() }));
ipcMain.handle('keyword:generate', (_event, request) => generateKeywordCandidates({ ...(request || {}), providerConfig: readKeywordProviderConfig(), profileRoot: profileRoot() }));
ipcMain.handle('media:relink-imported', (_event, request) => relinkImportedMedia(request));
ipcMain.handle('media:preview-relink-batch', (_event, request) => previewMediaRelinkBatch(request));
ipcMain.handle('media:apply-relink-batch', (_event, request) => applyMediaRelinkBatch(request));
ipcMain.handle('diagnostics:verify-restore-profile', () => verifyRestoreProfile());
ipcMain.handle('diagnostics:record-drag-probe', (_event, probe) => {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  const safeProbe = sanitizeProbe(probe);
  fs.appendFileSync(dragHarnessLogPath(), JSON.stringify(safeProbe) + '\n', 'utf8');
  return { ok: true, recordedAtUtc: safeProbe.recordedAtUtc };
});
ipcMain.handle('capture:localize-remote-url', (_event, request) => localizeRemoteImage(request));
ipcMain.handle('capture:commit-data-url', (_event, request) => {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'PROFILE_UNAVAILABLE' };
  try {
    const committed = commitDataUrl(profileRoot(), request || {});
    const persistence = insertDurableCapture(profileRoot(), {
      captureJobId: request?.captureId || committed.assetId,
      dayCanvasId: request?.dayCanvasId || request?.boardDate || 'undated',
      boardDate: request?.boardDate || request?.dayCanvasId || 'undated',
      sourceType: request?.sourceType || 'unknown',
      candidateManifest: request?.candidateManifest || {},
      assetId: committed.assetId,
      sha256: committed.sha256,
      originalRelpath: committed.originalRelpath,
      mime: committed.mime,
      byteLength: committed.byteLength,
      width: request?.pixelWidth || 0,
      height: request?.pixelHeight || 0,
      imageObject: request?.imageObject || {}
    });
    scheduleDerivativeBuild(committed.assetId);
    return { ok: true, ...committed, persistence, captureJob: committed.captureJob };
  } catch (error) {
    return { ok: false, error: error?.message || 'CAPTURE_COMMIT_FAILED' };
  }
});
