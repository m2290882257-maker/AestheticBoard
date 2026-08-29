const allowedMutationTypes = new Set([
  'day.title',
  'day.select',
  'camera.update',
  'camera.reset',
  'object.createImage',
  'object.createLink',
  'object.move',
  'object.resize',
  'object.zOrder',
  'object.lock',
  'object.note',
  'keyword.pin',
  'trash.move',
  'trash.restore',
  'trash.delete',
  'trash.clear',
  'surface.change',
  'workspace.alwaysOnTop',
  'capture.lifecycle',
  'drag.harness',
  'snapshot.checkpoint'
]);

const maxMutationsPerEnvelope = 80;
const maxStringLength = 20000;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).slice(0, maxStringLength);
}

function sanitizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sanitizePayload(payload, depth = 0) {
  if (depth > 6) return null;
  if (payload === null || payload === undefined) return payload ?? null;
  if (typeof payload === 'string') return sanitizeString(payload);
  if (typeof payload === 'number') return sanitizeNumber(payload);
  if (typeof payload === 'boolean') return payload;
  if (Array.isArray(payload)) return payload.slice(0, 200).map((item) => sanitizePayload(item, depth + 1));
  if (!isPlainObject(payload)) return null;
  return Object.fromEntries(Object.entries(payload).slice(0, 100).map(([key, value]) => [sanitizeString(key, '').slice(0, 80), sanitizePayload(value, depth + 1)]));
}

function validateSnapshot(snapshot) {
  if (!isPlainObject(snapshot)) return 'snapshot must be an object';
  if (!isPlainObject(snapshot.days)) return 'snapshot.days must be an object';
  if (typeof snapshot.activeDayId !== 'string' || !snapshot.activeDayId) return 'snapshot.activeDayId must be a string';
  return '';
}

function sanitizeMutation(raw, index) {
  if (!isPlainObject(raw)) return { error: 'mutation[' + index + '] must be an object' };
  const type = sanitizeString(raw.type);
  if (!allowedMutationTypes.has(type)) return { error: 'mutation[' + index + '] has unsupported type: ' + type };
  const id = sanitizeString(raw.id || (type + '-' + Date.now() + '-' + index));
  if (!id) return { error: 'mutation[' + index + '] requires id' };
  return {
    mutation: {
      id,
      type,
      targetId: raw.targetId == null ? null : sanitizeString(raw.targetId),
      dayCanvasId: raw.dayCanvasId == null ? null : sanitizeString(raw.dayCanvasId),
      createdAtUtc: sanitizeString(raw.createdAtUtc || new Date().toISOString()),
      payload: sanitizePayload(isPlainObject(raw.payload) ? raw.payload : {}) || {}
    }
  };
}

function validatePersistenceEnvelope(raw) {
  if (!isPlainObject(raw)) return { ok: false, error: 'Envelope must be an object' };
  if (Number(raw.schemaVersion) !== 1) return { ok: false, error: 'Unsupported mutation envelope schema' };
  const snapshotError = validateSnapshot(raw.snapshot);
  if (snapshotError) return { ok: false, error: snapshotError };
  if (!Array.isArray(raw.mutations) || raw.mutations.length < 1) return { ok: false, error: 'Envelope requires at least one mutation' };
  if (raw.mutations.length > maxMutationsPerEnvelope) return { ok: false, error: 'Too many mutations in one envelope' };
  const mutations = [];
  for (let index = 0; index < raw.mutations.length; index += 1) {
    const result = sanitizeMutation(raw.mutations[index], index);
    if (result.error) return { ok: false, error: result.error };
    mutations.push(result.mutation);
  }
  return {
    ok: true,
    envelope: {
      schemaVersion: 1,
      clientId: sanitizeString(raw.clientId || 'renderer').slice(0, 80),
      baseRevision: sanitizeNumber(raw.baseRevision, 0),
      createdAtUtc: sanitizeString(raw.createdAtUtc || new Date().toISOString()),
      mutations,
      snapshot: raw.snapshot
    }
  };
}

module.exports = { allowedMutationTypes: Array.from(allowedMutationTypes), validatePersistenceEnvelope };
