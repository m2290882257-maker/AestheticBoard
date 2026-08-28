const { app, BrowserWindow, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const stateFileName = 'workspace-state.json';
let mainWindow = null;
let workspaceState = {
  bounds: { width: 1180, height: 820 },
  alwaysOnTop: false
};

function statePath() {
  return path.join(app.getPath('userData'), stateFileName);
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
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
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

function createWindow() {
  readWorkspaceState();
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

app.whenReady().then(createWindow);
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
