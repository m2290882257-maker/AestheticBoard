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
  localizeRemoteImage: (request) => ipcRenderer.invoke('capture:localize-remote-url', { ...(request || {}), url: String(request?.url || '') }),
  repairMediaIndex: () => ipcRenderer.invoke('media:repair-index'),
  repairImportedMedia: (request) => ipcRenderer.invoke('media:relink-imported', request && typeof request === 'object' ? request : {}),
  previewMediaRelinkBatch: (request) => ipcRenderer.invoke('media:preview-relink-batch', request && typeof request === 'object' ? request : {}),
  applyMediaRelinkBatch: (request) => ipcRenderer.invoke('media:apply-relink-batch', request && typeof request === 'object' ? request : {}),
  loadWorkspaceSnapshot: () => ipcRenderer.invoke('persistence:load-snapshot'),
  saveWorkspaceMutations: (request) => ipcRenderer.invoke('persistence:save-mutations', mutationSummary(request)),
  writeRetryQueue: (request) => ipcRenderer.invoke('persistence:write-retry-queue', { queue: Array.isArray(request?.queue) ? request.queue : [], retrySequence: Number(request?.retrySequence || 0) }),
  searchBoard: (request) => ipcRenderer.invoke('search:query', { query: String(request?.query || ''), limit: Number(request?.limit || 80) }),
  rebuildSearchIndex: () => ipcRenderer.invoke('search:rebuild'),
  previewImportJson: () => ipcRenderer.invoke('import:preview-json'),
  importJsonAsNewDay: () => ipcRenderer.invoke('import:as-new-day'),
  writeExportJson: (request) => ipcRenderer.invoke('export:write-json', { filename: String(request?.filename || ''), content: String(request?.content || '') }),
  captureViewportPng: (request) => ipcRenderer.invoke('export:capture-viewport-png', { filename: String(request?.filename || '') }),
  captureFullDayPng: (request) => ipcRenderer.invoke('export:capture-full-day-png', { filename: String(request?.filename || ''), bounds: request?.bounds && typeof request.bounds === 'object' ? request.bounds : null }),
  exportRestoreFixture: (request) => ipcRenderer.invoke('diagnostics:export-restore-fixture', { snapshot: request?.snapshot && typeof request.snapshot === 'object' ? request.snapshot : null }),
  exportProfileBackup: (request) => ipcRenderer.invoke('backup:export-profile', { snapshot: request?.snapshot && typeof request.snapshot === 'object' ? request.snapshot : null }),
  getKeywordProviderState: () => ipcRenderer.invoke('keyword:get-provider-state'),
  getKeywordProviderDiagnostics: () => ipcRenderer.invoke('keyword:get-provider-diagnostics'),
  getKeywordKeyStatus: () => ipcRenderer.invoke('keyword:get-key-status'),
  importQwenApiKeyFile: () => ipcRenderer.invoke('keyword:import-qwen-key-file'),
  clearQwenApiKey: () => ipcRenderer.invoke('keyword:clear-qwen-key'),
  setKeywordProviderConfig: (request) => ipcRenderer.invoke('keyword:set-provider-config', request && typeof request === 'object' ? request : {}),
  testKeywordProvider: (request) => ipcRenderer.invoke('keyword:test-provider', request && typeof request === 'object' ? request : {}),
  validateKeywordProvider: (request) => ipcRenderer.invoke('keyword:validate-provider', request && typeof request === 'object' ? request : {}),
  generateKeywordCandidates: (request) => ipcRenderer.invoke('keyword:generate', request && typeof request === 'object' ? request : {}),
  verifyRestoreProfile: () => ipcRenderer.invoke('diagnostics:verify-restore-profile')
});
