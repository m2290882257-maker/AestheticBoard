const fullDayMaxPixels = 42 * 1000 * 1000;
const fullDayMaxDimension = 9000;
const fullDayMaxObjects = 180;

function sanitizeExportFileName(value, extension) {
  const fallback = 'aesthetic-board-' + Date.now() + extension;
  const name = String(value || fallback).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 140);
  return name.toLowerCase().endsWith(extension) ? name : name + extension;
}

function fullDayBoundsError(bounds) {
  const width = Number(bounds?.width || 0);
  const height = Number(bounds?.height || 0);
  const itemCount = Number(bounds?.itemCount || 0);
  if (!width || !height) return 'FULL_DAY_BOUNDS_MISSING';
  if (itemCount > fullDayMaxObjects) return 'FULL_DAY_EXPORT_TOO_MANY_OBJECTS';
  if (width * height > fullDayMaxPixels || width > fullDayMaxDimension || height > fullDayMaxDimension) return 'FULL_DAY_EXPORT_TOO_LARGE';
  return '';
}

function exportPolicySummary() {
  return 'Full-day PNG exports are capped at ' + fullDayMaxObjects + ' refs, ' + fullDayMaxDimension + 'px per side, and ' + Math.round(fullDayMaxPixels / 1000000) + 'MP source bounds.';
}

module.exports = { fullDayMaxPixels, fullDayMaxDimension, fullDayMaxObjects, sanitizeExportFileName, fullDayBoundsError, exportPolicySummary };
