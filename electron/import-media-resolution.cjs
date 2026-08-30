function safeImportString(value, limit = 20000) {
  return String(value || '').slice(0, limit);
}

function importSourceFromPayload(payload) {
  if (payload?.fixtureType === 'restore-harness' && payload.snapshot) return payload.snapshot;
  if (payload?.backupType === 'profile-backup' && payload.snapshot) return payload.snapshot;
  return payload;
}

function importDayFromSource(source) {
  if (source?.day && typeof source.day === 'object' && !Array.isArray(source.day)) return { day: source.day, dayId: source.activeDayId || '' };
  if (source?.days && typeof source.days === 'object' && !Array.isArray(source.days)) {
    const dayId = source.activeDayId && source.days[source.activeDayId] ? source.activeDayId : Object.keys(source.days)[0];
    if (dayId && source.days[dayId]) return { day: source.days[dayId], dayId };
  }
  return { day: null, dayId: '' };
}

function validateImportPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, error: 'IMPORT_NOT_OBJECT' };
  const source = importSourceFromPayload(payload);
  if (source.product && source.product !== 'AestheticBoard') return { ok: false, error: 'IMPORT_UNSUPPORTED_PRODUCT' };
  const { day, dayId } = importDayFromSource(source);
  if (!day || typeof day !== 'object' || Array.isArray(day)) return { ok: false, error: 'IMPORT_DAY_MISSING' };
  const items = Array.isArray(day.items) ? day.items : [];
  const trash = Array.isArray(day.trash) ? day.trash : [];
  if (items.length > 500 || trash.length > 500) return { ok: false, error: 'IMPORT_TOO_LARGE' };
  return { ok: true, source, day, sourceDayId: dayId, items, trash };
}

function mediaRefForImportItem(item) {
  const assetId = safeImportString(item?.assetId || item?.media?.assetId, 180);
  const sha256 = safeImportString(item?.sha256 || item?.media?.sha256, 128);
  const originalRelpath = safeImportString(item?.originalRelpath || item?.media?.originalRelpath, 500);
  if (!assetId && !sha256 && !originalRelpath) return null;
  return { assetId, sha256, originalRelpath };
}

function resolveImportMediaReferences(validation, mediaIndex = { assets: {} }) {
  const assets = mediaIndex.assets || {};
  const bySha = new Map(Object.values(assets).filter((asset) => asset.sha256).map((asset) => [asset.sha256, asset]));
  const refs = [];
  const inspect = (item, pathLabel) => {
    if (!item || item.kind === 'link') return;
    const ref = mediaRefForImportItem(item);
    if (!ref) { refs.push({ path: pathLabel, status: 'unsupported', reason: 'NO_MEDIA_REFERENCE', importedFromId: safeImportString(item?.id, 160) }); return; }
    const asset = (ref.assetId && assets[ref.assetId]) || (ref.sha256 && bySha.get(ref.sha256)) || null;
    refs.push({ path: pathLabel, status: asset ? 'matched' : 'missing', importedFromId: safeImportString(item?.id, 160), assetId: ref.assetId, sha256: ref.sha256, matchedAssetId: asset?.assetId || '', matchedSha256: asset?.sha256 || '', matchedOriginalRelpath: asset?.originalRelpath || '' });
  };
  validation.items.forEach((item, index) => inspect(item, 'items[' + index + ']'));
  validation.trash.forEach((entry, index) => inspect(entry?.item, 'trash[' + index + '].item'));
  const matched = refs.filter((ref) => ref.status === 'matched').length;
  const missing = refs.filter((ref) => ref.status === 'missing').length;
  const unsupported = refs.filter((ref) => ref.status === 'unsupported').length;
  return { refs: refs.length, matched, missing, unsupported, details: refs.slice(0, 40) };
}

function matchedImportAsset(item, resolution) {
  const ref = mediaRefForImportItem(item);
  if (!ref) return null;
  return (resolution?.details || []).find((detail) => detail.status === 'matched' && (detail.importedFromId === String(item?.id || '') || (ref.assetId && detail.assetId === ref.assetId) || (ref.sha256 && detail.sha256 === ref.sha256))) || null;
}

module.exports = { safeImportString, importSourceFromPayload, importDayFromSource, validateImportPayload, mediaRefForImportItem, resolveImportMediaReferences, matchedImportAsset };
