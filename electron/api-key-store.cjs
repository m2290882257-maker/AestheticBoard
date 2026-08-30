const fs = require('fs');
const path = require('path');

const secretsDirectoryName = 'secrets';
const qwenSecretFileName = 'qwen-api-key.bin';
const maxApiKeyLength = 4096;

function qwenApiKeyPath(profileRoot) {
  return path.join(profileRoot, secretsDirectoryName, qwenSecretFileName);
}

function normalizeApiKey(value) {
  return String(value || '').trim();
}

function safeStorageUsable(safeStorage) {
  return Boolean(safeStorage && typeof safeStorage.encryptString === 'function' && typeof safeStorage.decryptString === 'function' && (!safeStorage.isEncryptionAvailable || safeStorage.isEncryptionAvailable()));
}

function storedQwenApiKeyStatus(profileRoot, safeStorage) {
  const filePath = qwenApiKeyPath(profileRoot);
  const exists = fs.existsSync(filePath);
  const secureStorageAvailable = safeStorageUsable(safeStorage);
  return {
    providerId: 'qwen3.7-flash',
    available: exists && secureStorageAvailable,
    source: exists ? 'secure storage' : 'not set',
    secureStorageAvailable,
    secretVisibleToRenderer: false
  };
}

function readStoredQwenApiKey(profileRoot, safeStorage) {
  const filePath = qwenApiKeyPath(profileRoot);
  if (!fs.existsSync(filePath) || !safeStorageUsable(safeStorage)) return '';
  try {
    return normalizeApiKey(safeStorage.decryptString(fs.readFileSync(filePath)));
  } catch {
    return '';
  }
}

function writeStoredQwenApiKey(profileRoot, apiKey, safeStorage) {
  const key = normalizeApiKey(apiKey);
  if (!key) return { ok: false, error: 'AI_MISSING_API_KEY' };
  if (key.length > maxApiKeyLength) return { ok: false, error: 'AI_API_KEY_TOO_LONG' };
  if (!safeStorageUsable(safeStorage)) return { ok: false, error: 'AI_SECURE_STORAGE_UNAVAILABLE' };
  fs.mkdirSync(path.dirname(qwenApiKeyPath(profileRoot)), { recursive: true });
  fs.writeFileSync(qwenApiKeyPath(profileRoot), safeStorage.encryptString(key));
  return { ok: true, keyStatus: storedQwenApiKeyStatus(profileRoot, safeStorage) };
}

function clearStoredQwenApiKey(profileRoot) {
  const filePath = qwenApiKeyPath(profileRoot);
  if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
  return { ok: true, keyStatus: { providerId: 'qwen3.7-flash', available: false, source: 'not set', secretVisibleToRenderer: false } };
}

function qwenRuntimeEnv(profileRoot, safeStorage, env = process.env) {
  const runtime = { ...env };
  const stored = readStoredQwenApiKey(profileRoot, safeStorage);
  if (stored) {
    runtime.AESTHETICBOARD_QWEN_API_KEY = stored;
    runtime.AESTHETICBOARD_QWEN_API_KEY_SOURCE = 'secure storage';
  }
  return runtime;
}

function rendererSafeKeyStatus(profileRoot, safeStorage, env = process.env) {
  const stored = storedQwenApiKeyStatus(profileRoot, safeStorage);
  if (stored.available) return stored;
  if (normalizeApiKey(env.AESTHETICBOARD_QWEN_API_KEY)) return { providerId: 'qwen3.7-flash', available: true, source: 'AESTHETICBOARD_QWEN_API_KEY', secureStorageAvailable: stored.secureStorageAvailable, secretVisibleToRenderer: false };
  if (normalizeApiKey(env.DASHSCOPE_API_KEY)) return { providerId: 'qwen3.7-flash', available: true, source: 'DASHSCOPE_API_KEY', secureStorageAvailable: stored.secureStorageAvailable, secretVisibleToRenderer: false };
  return { providerId: 'qwen3.7-flash', available: false, source: 'not set', secureStorageAvailable: stored.secureStorageAvailable, secretVisibleToRenderer: false };
}

module.exports = { qwenApiKeyPath, normalizeApiKey, safeStorageUsable, storedQwenApiKeyStatus, readStoredQwenApiKey, writeStoredQwenApiKey, clearStoredQwenApiKey, qwenRuntimeEnv, rendererSafeKeyStatus };
