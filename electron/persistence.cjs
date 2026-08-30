const fs = require('fs');
const path = require('path');

const schemaVersion = 1;

const migration001 = `
CREATE TABLE IF NOT EXISTS schema_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS applied_migration (
  id TEXT PRIMARY KEY,
  applied_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS day_canvas (
  id TEXT PRIMARY KEY,
  board_date TEXT UNIQUE NOT NULL,
  title TEXT NULL,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media_asset (
  id TEXT PRIMARY KEY,
  sha256 TEXT UNIQUE NOT NULL,
  original_relpath TEXT NOT NULL,
  original_mime TEXT NOT NULL,
  pixel_width INTEGER NOT NULL DEFAULT 0,
  pixel_height INTEGER NOT NULL DEFAULT 0,
  byte_length INTEGER NOT NULL,
  created_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS image_object (
  id TEXT PRIMARY KEY,
  day_canvas_id TEXT NOT NULL REFERENCES day_canvas(id),
  media_asset_id TEXT NULL REFERENCES media_asset(id),
  capture_job_id TEXT NOT NULL,
  captured_at_utc TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT NULL,
  world_x REAL NOT NULL,
  world_y REAL NOT NULL,
  world_width REAL NOT NULL,
  world_height REAL NOT NULL,
  z_rank INTEGER NOT NULL,
  locked INTEGER NOT NULL DEFAULT 0,
  note_text TEXT NOT NULL DEFAULT '',
  lifecycle_state TEXT NOT NULL,
  revision INTEGER NOT NULL,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS image_keyword (
  id TEXT PRIMARY KEY,
  image_object_id TEXT NOT NULL REFERENCES image_object(id),
  text TEXT NOT NULL,
  dimension TEXT NOT NULL DEFAULT 'visual',
  ordinal INTEGER NOT NULL,
  ai_result_id TEXT NULL,
  created_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS keyword_preference (
  image_object_id TEXT PRIMARY KEY REFERENCES image_object(id),
  pinned_keyword_id TEXT NULL,
  updated_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS canvas_view_state (
  day_canvas_id TEXT PRIMARY KEY REFERENCES day_canvas(id),
  camera_x REAL NOT NULL,
  camera_y REAL NOT NULL,
  zoom REAL NOT NULL,
  updated_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS capture_job (
  id TEXT PRIMARY KEY,
  target_day_canvas_id TEXT NOT NULL REFERENCES day_canvas(id),
  state TEXT NOT NULL,
  candidate_manifest_json TEXT NOT NULL,
  last_error_code TEXT NULL,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_preference (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS search_index (
  id TEXT PRIMARY KEY,
  day_canvas_id TEXT NOT NULL,
  object_id TEXT NULL,
  entry_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  preview TEXT NOT NULL DEFAULT '',
  haystack TEXT NOT NULL DEFAULT '',
  captured_at_utc TEXT NOT NULL DEFAULT '',
  updated_at_utc TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_index_day ON search_index(day_canvas_id);
CREATE INDEX IF NOT EXISTS idx_search_index_haystack ON search_index(haystack);
CREATE TABLE IF NOT EXISTS mutation_retry (
  id TEXT PRIMARY KEY,
  day_canvas_id TEXT NULL,
  target_id TEXT NULL,
  mutation_type TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  queue_order INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  mutation_json TEXT NOT NULL,
  failed_at_utc TEXT NOT NULL DEFAULT '',
  last_retry_at_utc TEXT NOT NULL DEFAULT '',
  updated_at_utc TEXT NOT NULL
);
`;

function nowIso() { return new Date().toISOString(); }
function snapshotPath(profileRoot) { return path.join(profileRoot, 'workspace-snapshot.json'); }
function mutationLogPath(profileRoot) { return path.join(profileRoot, 'logs', 'mutation-log.jsonl'); }
function retryQueuePath(profileRoot) { return path.join(profileRoot, 'logs', 'mutation-retry-queue.json'); }

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
  fs.renameSync(tempPath, filePath);
}

function readJsonFile(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return null; }
}

function tryLoadSqlite() {
  try { return require('node:sqlite'); }
  catch { return null; }
}

function openDatabase(profileRoot) {
  const sqlite = tryLoadSqlite();
  if (!sqlite?.DatabaseSync) return null;
  return new sqlite.DatabaseSync(path.join(profileRoot, 'metadata.sqlite'));
}

function ensureMetadataStore(profileRoot) {
  fs.mkdirSync(profileRoot, { recursive: true });
  const dbPath = path.join(profileRoot, 'metadata.sqlite');
  const sqlite = tryLoadSqlite();
  if (!sqlite?.DatabaseSync) {
    const marker = {
      ready: false,
      driver: 'node:sqlite-unavailable',
      database: 'metadata.sqlite',
      schemaVersion,
      error: 'SQLite driver unavailable in this runtime',
      updatedAtUtc: nowIso()
    };
    fs.writeFileSync(path.join(profileRoot, 'metadata.sqlite.unavailable.json'), JSON.stringify(marker, null, 2));
    return marker;
  }

  const db = new sqlite.DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA busy_timeout = 5000;');
    db.exec('PRAGMA synchronous = NORMAL;');
    const check = db.prepare('PRAGMA quick_check;').get();
    const quickCheck = Object.values(check || {})[0];
    if (quickCheck !== 'ok') throw new Error('SQLite quick_check failed: ' + quickCheck);
    db.exec('BEGIN IMMEDIATE;');
    db.exec(migration001);
    const appliedAt = nowIso();
    db.prepare('INSERT OR IGNORE INTO applied_migration (id, applied_at_utc) VALUES (?, ?)').run('001_initial_profile_schema', appliedAt);
    db.prepare('INSERT OR REPLACE INTO schema_metadata (key, value, updated_at_utc) VALUES (?, ?, ?)').run('schema_version', String(schemaVersion), appliedAt);
    db.exec('COMMIT;');
    return { ready: true, driver: 'node:sqlite', database: 'metadata.sqlite', schemaVersion, quickCheck, updatedAtUtc: appliedAt };
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch {}
    const backup = path.join(profileRoot, 'metadata.sqlite.failed-' + Date.now());
    if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, backup);
    return { ready: false, driver: 'node:sqlite', database: 'metadata.sqlite', schemaVersion, error: error?.message || 'Migration failed', backup: path.basename(backup), updatedAtUtc: nowIso() };
  } finally {
    db.close();
  }
}

function insertKeywords(db, imageObjectId, keywords, now) {
  const insert = db.prepare('INSERT OR REPLACE INTO image_keyword (id, image_object_id, text, dimension, ordinal, ai_result_id, created_at_utc) VALUES (?, ?, ?, ?, ?, NULL, ?)');
  (keywords || []).slice(0, 12).forEach((keyword, index) => {
    insert.run(imageObjectId + '-keyword-' + index, imageObjectId, String(keyword), index === 0 ? 'primary' : 'visual', index, now);
  });
}

function insertDurableCapture(profileRoot, capture) {
  const db = openDatabase(profileRoot);
  if (!db) return { ok: false, error: 'SQLite driver unavailable' };
  const now = nowIso();
  const image = capture.imageObject || {};
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('BEGIN IMMEDIATE;');
    db.prepare('INSERT OR IGNORE INTO day_canvas (id, board_date, title, created_at_utc, updated_at_utc) VALUES (?, ?, NULL, ?, ?)').run(capture.dayCanvasId, capture.boardDate, now, now);
    db.prepare('UPDATE day_canvas SET updated_at_utc = ? WHERE id = ?').run(now, capture.dayCanvasId);
    db.prepare('INSERT OR REPLACE INTO capture_job (id, target_day_canvas_id, state, candidate_manifest_json, last_error_code, created_at_utc, updated_at_utc) VALUES (?, ?, ?, ?, NULL, ?, ?)').run(capture.captureJobId, capture.dayCanvasId, 'DURABLE', JSON.stringify(capture.candidateManifest || {}), now, now);
    db.prepare('INSERT OR IGNORE INTO media_asset (id, sha256, original_relpath, original_mime, pixel_width, pixel_height, byte_length, created_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(capture.assetId, capture.sha256, capture.originalRelpath, capture.mime, capture.width || 0, capture.height || 0, capture.byteLength, now);
    db.prepare(`
      INSERT OR REPLACE INTO image_object (
        id, day_canvas_id, media_asset_id, capture_job_id, captured_at_utc, source_type, source_url,
        world_x, world_y, world_width, world_height, z_rank, locked, note_text, lifecycle_state,
        revision, created_at_utc, updated_at_utc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      image.id || capture.captureJobId,
      capture.dayCanvasId,
      capture.assetId,
      capture.captureJobId,
      image.capturedAt || now,
      image.sourceType || capture.sourceType || 'unknown',
      image.sourceUrl || null,
      Number(image.x || 0),
      Number(image.y || 0),
      Number(image.width || 0),
      Number(image.height || 0),
      Number(image.z || 0),
      image.locked ? 1 : 0,
      String(image.note || ''),
      image.lifecycleState || 'DURABLE',
      Number(image.revision || 1),
      image.createdAt || now,
      now
    );
    insertKeywords(db, image.id || capture.captureJobId, image.keywords, now);
    db.exec('COMMIT;');
    return { ok: true, database: 'metadata.sqlite' };
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch {}
    return { ok: false, error: error?.message || 'Durable capture insert failed' };
  } finally {
    db.close();
  }
}


function normalizeSearchText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function dateFromDayId(dayId) {
  const parts = String(dayId || '').split('-').map(Number);
  return new Date(parts[0] || 1970, (parts[1] || 1) - 1, parts[2] || 1);
}

function formatSearchDate(dayId) {
  try { return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(dateFromDayId(dayId)); }
  catch { return String(dayId || ''); }
}

function hostFromUrl(value) {
  try { return new URL(String(value || '')).host; }
  catch { return ''; }
}

function cleanPreview(value, limit = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function approvedKeywordTexts(item = {}) {
  const seen = new Set();
  const values = [];
  const add = (value) => {
    const text = String(value || '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    values.push(text);
  };
  (Array.isArray(item.keywords) ? item.keywords : []).forEach(add);
  (Array.isArray(item.keywordCandidates) ? item.keywordCandidates : [])
    .filter((candidate) => candidate && candidate.state === 'accepted')
    .forEach((candidate) => add(candidate.text || candidate.keyword || candidate.en));
  return values;
}

function linkTitleFromUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const lastPath = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
    return lastPath ? lastPath.replace(/[-_]+/g, ' ').slice(0, 64) : url.hostname;
  } catch {
    return cleanPreview(value, 64) || 'Link';
  }
}

function searchRowsFromSnapshot(snapshot) {
  const rows = [];
  Object.entries(snapshot?.days || {}).forEach(([dayId, board]) => {
    const dayTitle = board?.title || formatSearchDate(dayId);
    rows.push({ id: 'day:' + dayId, dayCanvasId: dayId, objectId: '', type: 'day', title: dayTitle, preview: dayId, capturedAtUtc: '', haystack: normalizeSearchText([dayTitle, dayId, formatSearchDate(dayId)].join(' ')) });
    (board?.items || []).forEach((item) => {
      const kind = item.kind || 'image';
      const url = item.url || item.sourceUrl || '';
      const approvedKeywords = approvedKeywordTexts(item);
      const title = kind === 'link' ? (item.label || linkTitleFromUrl(url)) : (approvedKeywords[0] || 'Image');
      const preview = kind === 'link' ? [hostFromUrl(url), item.note].filter(Boolean).join(' - ') : [item.note, approvedKeywords.slice(1, 3).join(', ')].filter(Boolean).join(' - ');
      rows.push({ id: String(item.id || item.captureJobId || ('object:' + rows.length)), dayCanvasId: dayId, objectId: String(item.id || ''), type: kind, title, preview: cleanPreview(preview, 140), capturedAtUtc: String(item.capturedAtUtc || item.capturedAt || item.createdAtUtc || ''), haystack: normalizeSearchText([kind, item.sourceType || '', item.label || '', url, hostFromUrl(url), item.note || '', approvedKeywords.join(' '), item.capturedAtUtc || item.capturedAt || item.createdAtUtc || '', dayId, board.title || '', formatSearchDate(dayId)].join(' ')) });
    });
  });
  return rows;
}

function rebuildSearchIndex(profileRoot, snapshot) {
  const db = openDatabase(profileRoot);
  if (!db) return { ok: false, error: 'SQLite driver unavailable', indexed: 0 };
  const now = nowIso();
  const rows = searchRowsFromSnapshot(snapshot || {});
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('BEGIN IMMEDIATE;');
    db.prepare('DELETE FROM search_index').run();
    const insert = db.prepare('INSERT OR REPLACE INTO search_index (id, day_canvas_id, object_id, entry_type, title, preview, haystack, captured_at_utc, updated_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((row) => insert.run(row.id, row.dayCanvasId, row.objectId, row.type, row.title, row.preview, row.haystack, row.capturedAtUtc, now));
    db.exec('COMMIT;');
    return { ok: true, database: 'metadata.sqlite', indexed: rows.length, updatedAtUtc: now };
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch {}
    return { ok: false, error: error?.message || 'Search index rebuild failed', indexed: 0 };
  } finally { db.close(); }
}

function querySearchIndex(profileRoot, query, limit = 80) {
  const q = normalizeSearchText(query);
  if (!q) return { ok: true, source: 'metadata.sqlite', results: [] };
  const db = openDatabase(profileRoot);
  if (!db) return { ok: false, error: 'SQLite driver unavailable', results: [] };
  try {
    const escaped = q.replace(/[%_]/g, (match) => '\\' + match);
    const rows = db.prepare("SELECT id, day_canvas_id, object_id, entry_type, title, preview, captured_at_utc FROM search_index WHERE haystack LIKE ? ESCAPE '\\' ORDER BY captured_at_utc DESC, day_canvas_id DESC LIMIT ?").all('%' + escaped + '%', Math.max(1, Math.min(Number(limit) || 80, 200)));
    return { ok: true, source: 'metadata.sqlite', results: rows.map((row) => ({ id: row.object_id || row.id, dayId: row.day_canvas_id, type: row.entry_type, title: row.title, preview: row.preview, capturedAtUtc: row.captured_at_utc })) };
  } catch (error) {
    return { ok: false, error: error?.message || 'Search query failed', results: [] };
  } finally { db.close(); }
}

function writeRetryQueue(profileRoot, retryQueue, retrySequence = 0) {
  const now = nowIso();
  const queue = Array.isArray(retryQueue) ? retryQueue : [];
  const payload = { schemaVersion: 1, retrySequence: Number(retrySequence || 0), queue, updatedAtUtc: now };
  writeJsonAtomic(retryQueuePath(profileRoot), payload);
  const db = openDatabase(profileRoot);
  if (!db) return { ok: true, source: 'mutation-retry-queue.json', sqlite: { ok: false, error: 'SQLite driver unavailable' }, queued: queue.length, updatedAtUtc: now };
  try {
    db.exec('BEGIN IMMEDIATE;');
    db.prepare('DELETE FROM mutation_retry').run();
    const insert = db.prepare('INSERT OR REPLACE INTO mutation_retry (id, day_canvas_id, target_id, mutation_type, retry_count, queue_order, error, mutation_json, failed_at_utc, last_retry_at_utc, updated_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    queue.forEach((entry) => insert.run(String(entry.id || entry.mutation?.id || ''), entry.dayCanvasId || entry.mutation?.dayCanvasId || null, entry.targetId || entry.mutation?.targetId || null, String(entry.mutation?.type || ''), Number(entry.retryCount || 0), Number(entry.order || 0), String(entry.error || ''), JSON.stringify(entry.mutation || {}), String(entry.failedAtUtc || ''), String(entry.lastRetryAtUtc || ''), now));
    db.exec('COMMIT;');
    return { ok: true, source: 'mutation-retry-queue.json', sqlite: { ok: true, database: 'metadata.sqlite' }, queued: queue.length, updatedAtUtc: now };
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch {}
    return { ok: true, source: 'mutation-retry-queue.json', sqlite: { ok: false, error: error?.message || 'Retry queue SQLite write failed' }, queued: queue.length, updatedAtUtc: now };
  } finally { db.close(); }
}

function readRetryQueue(profileRoot) {
  const filePayload = readJsonFile(retryQueuePath(profileRoot));
  if (filePayload?.queue) return { ok: true, source: 'mutation-retry-queue.json', retrySequence: Number(filePayload.retrySequence || 0), queue: Array.isArray(filePayload.queue) ? filePayload.queue : [], updatedAtUtc: filePayload.updatedAtUtc || '' };
  const db = openDatabase(profileRoot);
  if (!db) return { ok: true, source: 'none', retrySequence: 0, queue: [] };
  try {
    const rows = db.prepare('SELECT * FROM mutation_retry ORDER BY queue_order ASC').all();
    const queue = rows.map((row) => ({ id: row.id, order: row.queue_order, retryCount: row.retry_count, dayCanvasId: row.day_canvas_id, targetId: row.target_id, mutation: JSON.parse(row.mutation_json || '{}'), error: row.error, failedAtUtc: row.failed_at_utc, lastRetryAtUtc: row.last_retry_at_utc }));
    return { ok: true, source: 'metadata.sqlite', retrySequence: queue.reduce((max, entry) => Math.max(max, Number(entry.order || 0)), 0), queue };
  } catch (error) {
    return { ok: false, error: error?.message || 'Retry queue read failed', retrySequence: 0, queue: [] };
  } finally { db.close(); }
}

function saveSnapshotToSqlite(profileRoot, snapshot, now) {
  const db = openDatabase(profileRoot);
  if (!db) return { ok: false, error: 'SQLite driver unavailable' };
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('BEGIN IMMEDIATE;');
    db.prepare('INSERT OR REPLACE INTO app_preference (key, value_json, updated_at_utc) VALUES (?, ?, ?)').run('canvas_state', JSON.stringify(snapshot), now);
    Object.entries(snapshot.days || {}).forEach(([dayId, day]) => {
      db.prepare('INSERT OR IGNORE INTO day_canvas (id, board_date, title, created_at_utc, updated_at_utc) VALUES (?, ?, ?, ?, ?)').run(dayId, dayId, day.title || null, now, now);
      db.prepare('UPDATE day_canvas SET title = ?, updated_at_utc = ? WHERE id = ?').run(day.title || null, now, dayId);
      db.prepare('INSERT OR REPLACE INTO canvas_view_state (day_canvas_id, camera_x, camera_y, zoom, updated_at_utc) VALUES (?, ?, ?, ?, ?)').run(dayId, Number(day.camera?.x || 0), Number(day.camera?.y || 0), Number(day.camera?.zoom || 1), now);
    });
    const searchRows = searchRowsFromSnapshot(snapshot);
    db.prepare('DELETE FROM search_index').run();
    const insertSearch = db.prepare('INSERT OR REPLACE INTO search_index (id, day_canvas_id, object_id, entry_type, title, preview, haystack, captured_at_utc, updated_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    searchRows.forEach((row) => insertSearch.run(row.id, row.dayCanvasId, row.objectId, row.type, row.title, row.preview, row.haystack, row.capturedAtUtc, now));
    db.exec('COMMIT;');
    return { ok: true, database: 'metadata.sqlite', searchIndexed: searchRows.length };
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch {}
    return { ok: false, error: error?.message || 'Snapshot SQLite write failed' };
  } finally {
    db.close();
  }
}

function appendMutationLog(profileRoot, mutations, revision, now) {
  if (!Array.isArray(mutations) || !mutations.length) return;
  fs.mkdirSync(path.dirname(mutationLogPath(profileRoot)), { recursive: true });
  const lines = mutations.map((mutation) => JSON.stringify({ ...mutation, ackRevision: revision, ackedAtUtc: now })).join('\n') + '\n';
  fs.appendFileSync(mutationLogPath(profileRoot), lines, 'utf8');
}

function saveWorkspaceSnapshot(profileRoot, snapshot, options = {}) {
  const now = nowIso();
  const mutations = Array.isArray(options.mutations) ? options.mutations : [];
  const payload = {
    ...(snapshot || {}),
    persistenceRevision: Number(snapshot?.persistenceRevision || 0) + 1,
    updatedAtUtc: now,
    lastMutationBatch: {
      ids: mutations.map((mutation) => mutation.id),
      types: mutations.map((mutation) => mutation.type),
      ackedAtUtc: now
    }
  };
  writeJsonAtomic(snapshotPath(profileRoot), payload);
  appendMutationLog(profileRoot, mutations, payload.persistenceRevision, now);
  const sqlite = saveSnapshotToSqlite(profileRoot, payload, now);
  const retryMetadata = writeRetryQueue(profileRoot, payload.retryQueue || [], payload.retrySequence || 0);
  return { ok: true, revision: payload.persistenceRevision, updatedAtUtc: now, mutationIds: mutations.map((mutation) => mutation.id), coalescedCount: mutations.length, sqlite, retryMetadata, searchIndexed: sqlite.searchIndexed || 0 };
}

function loadWorkspaceSnapshot(profileRoot) {
  const snapshot = readJsonFile(snapshotPath(profileRoot));
  if (snapshot) return { ok: true, source: 'workspace-snapshot.json', snapshot };
  const db = openDatabase(profileRoot);
  if (!db) return { ok: false, error: 'No snapshot available' };
  try {
    const row = db.prepare('SELECT value_json FROM app_preference WHERE key = ?').get('canvas_state');
    if (!row?.value_json) return { ok: false, error: 'No snapshot available' };
    return { ok: true, source: 'metadata.sqlite', snapshot: JSON.parse(row.value_json) };
  } catch (error) {
    return { ok: false, error: error?.message || 'Snapshot read failed' };
  } finally {
    db.close();
  }
}
module.exports = { ensureMetadataStore, insertDurableCapture, saveWorkspaceSnapshot, loadWorkspaceSnapshot, rebuildSearchIndex, querySearchIndex, writeRetryQueue, readRetryQueue, approvedKeywordTexts, schemaVersion };
