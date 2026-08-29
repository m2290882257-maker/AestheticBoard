const { app, BrowserWindow, ipcMain, screen, protocol, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { ensureMetadataStore, insertDurableCapture, saveWorkspaceSnapshot, loadWorkspaceSnapshot } = require('./persistence.cjs');
const { commitDataUrl, resolveAssetPath, recoverCaptureJobs, repairMediaIndex } = require('./media-store.cjs');
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
    if (loaded?.ok) loaded.captureRecovery = recoverCaptureJobs(this.rootProvider());
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
function exportPathFor(filename, extension) {
  const safeName = sanitizeExportFileName(filename, extension);
  return { fullPath: path.join(profileRoot(), 'exports', safeName), relativePath: 'exports/' + safeName };
}
function writeExportJson(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  const content = String(request?.content || '');
  if (!content || content.length > 10 * 1024 * 1024) return { ok: false, error: 'INVALID_EXPORT_JSON' };
  try { JSON.parse(content); } catch { return { ok: false, error: 'EXPORT_JSON_PARSE_FAILED' }; }
  const target = exportPathFor(request?.filename, '.json');
  fs.mkdirSync(path.dirname(target.fullPath), { recursive: true });
  fs.writeFileSync(target.fullPath, content, 'utf8');
  return { ok: true, relativePath: target.relativePath, byteLength: Buffer.byteLength(content, 'utf8') };
}
async function captureViewportPng(request) {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: 'WINDOW_UNAVAILABLE' };
  const target = exportPathFor(request?.filename, '.png');
  fs.mkdirSync(path.dirname(target.fullPath), { recursive: true });
  const image = await mainWindow.webContents.capturePage();
  const buffer = image.toPNG();
  fs.writeFileSync(target.fullPath, buffer);
  return { ok: true, relativePath: target.relativePath, byteLength: buffer.length };
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
  return persistenceWorker.enqueue(validation.envelope);
});

ipcMain.handle('export:write-json', (_event, request) => writeExportJson(request));
ipcMain.handle('export:capture-viewport-png', (_event, request) => captureViewportPng(request));
ipcMain.handle('diagnostics:record-drag-probe', (_event, probe) => {
  const state = safeProfileState();
  if (!state.ready) return { ok: false, error: state.error || 'Profile unavailable' };
  const safeProbe = sanitizeProbe(probe);
  fs.appendFileSync(dragHarnessLogPath(), JSON.stringify(safeProbe) + '\n', 'utf8');
  return { ok: true, recordedAtUtc: safeProbe.recordedAtUtc };
});
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
