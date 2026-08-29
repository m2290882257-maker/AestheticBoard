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
  loadWorkspaceSnapshot: () => ipcRenderer.invoke('persistence:load-snapshot'),
  saveWorkspaceMutations: (request) => ipcRenderer.invoke('persistence:save-mutations', mutationSummary(request))
});
