const { app, BrowserWindow, ipcMain, screen, protocol, net, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { ensureMetadataStore, insertDurableCapture, saveWorkspaceSnapshot, loadWorkspaceSnapshot } = require('./persistence.cjs');
const { commitDataUrl, resolveAssetPath, recoverCaptureJobs, repairMediaIndex, readCaptureJobs, readMediaIndex } = require('./media-store.cjs');
const { validatePersistenceEnvelope } = require('./mutation-contract.cjs');

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

function sanitizeExportFileName(value, extension) {
  const fallback = 'aesthetic-board-' + Date.now() + extension;
  const name = String(value || fallback).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 140);
  return name.toLowerCase().endsWith(extension) ? name : name + extension;
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
const remoteImageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const remoteImageMaxBytes = 25 * 1024 * 1024;
function detectRemoteImageMime(bytes) {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length > 6 && bytes.slice(0, 3).toString('ascii') === 'GIF') return 'image/gif';
  if (bytes.length > 12 && bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  throw new Error('REMOTE_UNSUPPORTED_MAGIC_BYTES');
}
function validateRemoteImageUrl(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { throw new Error('REMOTE_INVALID_URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('REMOTE_UNSUPPORTED_PROTOCOL');
  return url.toString();
}
function mimeFromResponse(response) {
  return String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
}
async function fetchRemoteImageDataUrl(url) {
  const safeUrl = validateRemoteImageUrl(url);
  const response = await net.fetch(safeUrl, { redirect: 'follow' });
  if (!response.ok) throw new Error('REMOTE_FETCH_' + response.status);
  const mime = mimeFromResponse(response);
  if (mime && !remoteImageMimeTypes.has(mime)) throw new Error('REMOTE_UNSUPPORTED_TYPE');
  const lengthHeader = Number(response.headers.get('content-length') || 0);
  if (lengthHeader > remoteImageMaxBytes) throw new Error('REMOTE_IMAGE_TOO_LARGE');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('REMOTE_EMPTY_BODY');
  if (bytes.length > remoteImageMaxBytes) throw new Error('REMOTE_IMAGE_TOO_LARGE');
  const detectedMime = detectRemoteImageMime(bytes);
  if (mime && mime !== detectedMime) throw new Error('REMOTE_MIME_MAGIC_MISMATCH');
  return { dataUrl: 'data:' + detectedMime + ';base64,' + bytes.toString('base64'), byteLength: bytes.length, mime: detectedMime, finalUrl: response.url || safeUrl };
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
function buildRestoreFixture(snapshot) {
  const mediaIndex = readMediaIndex(profileRoot());
  const captureJobs = readCaptureJobs(profileRoot());
  return {
    schemaVersion: 1,
    product: 'AestheticBoard',
    fixtureType: 'restore-harness',
    exportedAtUtc: new Date().toISOString(),
    snapshot: sanitizeFixtureSnapshot(snapshot),
    mediaAssets: Object.values(mediaIndex.assets || {}).map((asset) => ({ assetId: asset.assetId, sha256: asset.sha256, originalRelpath: asset.originalRelpath, variants: asset.variants ? Object.fromEntries(Object.entries(asset.variants).map(([key, record]) => [key, { role: record.role, state: record.state, relpath: record.relpath, mime: record.mime, byteLength: record.byteLength || 0 }])) : {} })),
    captureJobs: Object.values(captureJobs.jobs || {}).map((job) => ({ id: job.id, state: job.state, dayCanvasId: job.dayCanvasId, sourceType: job.sourceType, assetId: job.assetId || "", sha256: job.sha256 || "", originalRelpath: job.originalRelpath || "", lastErrorCode: job.lastErrorCode || "" })),
    scenarios: ["snapshot-interruption", "staging-residue", "durable-media", "failed-capture-job"]
  };
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
    checkedAtUtc: new Date().toISOString()
  };
  return result;
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
ipcMain.handle('diagnostics:export-restore-fixture', (_event, request) => exportRestoreFixture(request));
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
    return { ok: true, ...committed, persistence, captureJob: committed.captureJob };
  } catch (error) {
    return { ok: false, error: error?.message || 'CAPTURE_COMMIT_FAILED' };
  }
});
