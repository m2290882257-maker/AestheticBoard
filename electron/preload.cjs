const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aestheticBoardShell', {
  getShellState: () => ipcRenderer.invoke('workspace:get-shell-state'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('workspace:set-always-on-top', Boolean(value))
});
