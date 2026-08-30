const fullDayMaxPixels = 60 * 1000 * 1000;
const fullDayMaxDimension = 10000;

function sanitizeExportFileName(value, extension) {
  const fallback = 'aesthetic-board-' + Date.now() + extension;
  const name = String(value || fallback).replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 140);
  return name.toLowerCase().endsWith(extension) ? name : name + extension;
}

function fullDayBoundsError(bounds) {
  const width = Number(bounds?.width || 0);
  const height = Number(bounds?.height || 0);
  if (!width || !height) return 'FULL_DAY_BOUNDS_MISSING';
  if (width * height > fullDayMaxPixels || width > fullDayMaxDimension || height > fullDayMaxDimension) return 'FULL_DAY_EXPORT_TOO_LARGE';
  return '';
}

function exportPolicySummary() {
  return 'Full-day PNG exports are capped at ' + fullDayMaxDimension + 'px per side and ' + Math.round(fullDayMaxPixels / 1000000) + 'MP source bounds.';
}

module.exports = { fullDayMaxPixels, fullDayMaxDimension, sanitizeExportFileName, fullDayBoundsError, exportPolicySummary };
