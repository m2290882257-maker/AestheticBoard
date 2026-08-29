const { contextBridge, ipcRenderer } = require('electron');

function mutationSummary(request) {
  return {
    schemaVersion: Number(request?.schemaVersion || 0),
    clientId: String(request?.clientId || 'renderer'),
    baseRevision: Number(request?.baseRevision || 0),
    createdAtUtc: String(request?.createdAtUtc || new Date().toISOString()),
    mutations: Array.isArray(request?.mutations) ? request.mutations : [],
    snapshot: request?.snapshot && typeof request.snapshot === 'object' ? request.snapshot : null
  };
}

contextBridge.exposeInMainWorld('aestheticBoardShell', {
  getShellState: () => ipcRenderer.invoke('workspace:get-shell-state'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('workspace:set-always-on-top', Boolean(value)),
  getProfileState: () => ipcRenderer.invoke('profile:get-state'),
  recordDragProbe: (probe) => ipcRenderer.invoke('diagnostics:record-drag-probe', probe),
  commitCapturedMedia: (request) => ipcRenderer.invoke('capture:commit-data-url', request),
  repairMediaIndex: () => ipcRenderer.invoke('media:repair-index'),
  loadWorkspaceSnapshot: () => ipcRenderer.invoke('persistence:load-snapshot'),
  saveWorkspaceMutations: (request) => ipcRenderer.invoke('persistence:save-mutations', mutationSummary(request)),
  writeExportJson: (request) => ipcRenderer.invoke('export:write-json', { filename: String(request?.filename || ''), content: String(request?.content || '') }),
  captureViewportPng: (request) => ipcRenderer.invoke('export:capture-viewport-png', { filename: String(request?.filename || '') }),
  exportRestoreFixture: (request) => ipcRenderer.invoke('diagnostics:export-restore-fixture', { snapshot: request?.snapshot && typeof request.snapshot === 'object' ? request.snapshot : null }),
  verifyRestoreProfile: () => ipcRenderer.invoke('diagnostics:verify-restore-profile')
});
