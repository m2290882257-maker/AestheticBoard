const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aestheticBoardShell', {
  getShellState: () => ipcRenderer.invoke('workspace:get-shell-state'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('workspace:set-always-on-top', Boolean(value)),
  getProfileState: () => ipcRenderer.invoke('profile:get-state'),
  recordDragProbe: (probe) => ipcRenderer.invoke('diagnostics:record-drag-probe', probe),
  commitCapturedMedia: (request) => ipcRenderer.invoke('capture:commit-data-url', request),
  loadWorkspaceSnapshot: () => ipcRenderer.invoke('persistence:load-snapshot'),
  saveWorkspaceSnapshot: (snapshot) => ipcRenderer.invoke('persistence:save-snapshot', snapshot)
});
