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
`;

function nowIso() { return new Date().toISOString(); }

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

module.exports = { ensureMetadataStore, insertDurableCapture, schemaVersion };
