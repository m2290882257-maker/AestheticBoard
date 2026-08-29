const ONE_DAY = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "aesthetic-board.vertical-slice.v2";
const LEGACY_STORAGE_KEY = "aesthetic-board.vertical-slice.v1";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const DEFAULT_CAMERA = { x: 0, y: 0, zoom: 1 };
const CAPTURE_MICRO_OFFSET = 24;
const TRASH_FEEDBACK_MS = 1200;
const DENSE_ITEM_THRESHOLD = 24;
const ZOOMED_OUT_THRESHOLD = 0.62;
const DRAG_HARNESS_LIMIT = 30;
const TEXT_PREVIEW_LIMIT = 140;
const AI_KEYWORD_MAX = 8;
const AI_KEYWORD_HISTORY_MAX = 32;
const copyIcon = "refer/icon/copy (1).svg";

const surfaces = {
  quiet: { label: "Quiet Paper", image: "refer/纸张纹理/safwan-thottoli-upQCmuAFGho-unsplash.jpg", status: "default" },
  paperGrain: { label: "Paper Grain", image: "refer/纸张纹理/safwan-thottoli-ZOjLtBNuY2E-unsplash.jpg", status: "available" },
  warmDeckle: { label: "Warm Deckle", image: "refer/纸张纹理/carmen-alarcon-tpH5er39OHk-unsplash.jpg", status: "available" },
  cottonField: { label: "Cotton Field", image: "refer/纸张纹理/kiwihug-qv05FvdE26k-unsplash.jpg", status: "available" },
  paleFiber: { label: "Pale Fiber", image: "refer/纸张纹理/kiwihug-y_2GC4EhOP4-unsplash.jpg", status: "available" },
  softIvory: { label: "Soft Ivory", image: "refer/纸张纹理/kiwihug-cqhXfrRHCPo-unsplash.jpg", status: "available" },
  greyArchive: { label: "Grey Archive", image: "refer/纸张纹理/kseniya-lapteva-bw6EB47LpfU-unsplash.jpg", status: "available" },
  linenLight: { label: "Linen Light", image: "refer/纸张纹理/olga-thelavart-vS3idIiYxX0-unsplash.jpg", status: "available" },
  handmadeSheet: { label: "Handmade Sheet", image: "refer/纸张纹理/joao-vitor-duarte-k4Lt0CjUnb0-unsplash.jpg", status: "available" },
  rawFiber: { label: "Raw Fiber", image: "refer/纸张纹理/heather-green-OIKBzKrTdxA-unsplash.jpg", status: "experimental" },
  heavyPulp: { label: "Heavy Pulp", image: "refer/纸张纹理/resource-boy-zJBxYP-hIS8-unsplash.jpg", status: "experimental" },
  flat: { label: "Editorial Flat", image: "", status: "available" }
};

const initialItems = [
  { id: "img-01", src: "refer/测试照片/测试照片1.jpg", x: 265, y: 185, width: 286, z: 3, locked: false, keywords: ["soft grain", "muted blue", "candid photography", "negative space", "film texture", "quiet composition"], note: "喜欢这种像是无意间留下来的画面。不是很完整，但空气和人物之间的距离特别好。" },
  { id: "img-02", src: "refer/测试照片/测试照片5.jpg", x: 610, y: 150, width: 245, z: 2, locked: false, keywords: ["editorial layout", "oversized typography", "asymmetric grid", "warm ivory", "image-led composition"], note: "文字其实很大，但没有压过图片。可以参考这种大标题加大留白的比例关系。" },
  { id: "img-03", src: "refer/测试照片/测试照片8.jpg", x: 930, y: 280, width: 225, z: 1, locked: true, keywords: ["paper texture", "low contrast", "faded beige", "archival mood", "soft shadow"], note: "可以作为白板默认背景的参考。旧感要很轻，不要真的像一张做旧素材。" },
  { id: "img-04", src: "refer/测试照片/测试照片11.jpg", x: 455, y: 520, width: 310, z: 4, locked: false, keywords: ["visual memory", "temporal layering", "faded photograph", "handwritten note", "quiet archive", "personal trace"], note: "图片是被捕获的瞬间，关键词负责以后重新找到它，Note 留下的是当时为什么停在这里。" }
];

const boardShell = document.querySelector(".board-shell");
const canvas = document.querySelector("#canvas");
const titleArea = document.querySelector(".title-area");
const titleButton = document.querySelector("#board-title");
const titleEditor = document.querySelector("#title-editor");
const dateLabel = document.querySelector("#date-label");
const popoverLayer = document.querySelector("#popover-layer");
const saveState = document.querySelector("#save-state");
const modeSelector = document.querySelector("#mode-selector");
const resetView = document.querySelector("#reset-view");
const zoomPercent = document.querySelector("#zoom-percent");
const trashButton = document.querySelector('[data-popover="trash"]');
const shellBridge = window.aestheticBoardShell || null;
let shellState = { alwaysOnTop: false };
let profileState = { ready: false, profileLabel: "Browser preview", directories: [], keywordProvider: { activeProvider: "local-mock", externalProviderEnabled: false, modeLabel: "Local mock only", permissions: { imageAccess: false, textAccess: true, network: false }, consentVersion: "provider-consent-v1" } };

const state = loadState();
let dragIntent = null;
let saveTimer = 0;
let latestPersistenceRequest = 0;
let lastAckRevision = Number(state.persistenceRevision || 0);
let searchState = { open: false, query: "", results: [], selectedIndex: 0, source: "renderer" };
let durableSearchRequest = 0;
let retrySequence = Number(state.retrySequence || 0);
let conflictState = { active: false, message: "" };
let mediaRelinkBatchState = null;

function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function padDatePart(value) { return String(value).padStart(2, "0"); }
function dateKeyFromDate(date) {
  const localDate = startOfDay(date);
  return `${localDate.getFullYear()}-${padDatePart(localDate.getMonth() + 1)}-${padDatePart(localDate.getDate())}`;
}
function activeDate() {
  return dateFromDayId(state.activeDayId);
}
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function cloneKeywordCandidates(candidates) {
  return (Array.isArray(candidates) ? candidates : []).map((candidate, index) => {
    const state = String(candidate.state || "suggested");
    const createdAtUtc = String(candidate.createdAtUtc || candidate.generatedAtUtc || new Date().toISOString());
    return {
      id: String(candidate.id || "candidate-" + index),
      text: String(candidate.text || "").trim(),
      confidence: Number(candidate.confidence || 0),
      source: String(candidate.source || candidate.provider || "local-mock"),
      provider: String(candidate.provider || candidate.source || "local-mock"),
      state,
      createdAtUtc,
      reviewedAtUtc: String(candidate.reviewedAtUtc || ""),
      acceptedAtUtc: String(candidate.acceptedAtUtc || ""),
      dismissedAtUtc: String(candidate.dismissedAtUtc || ""),
      pinnedAtUtc: String(candidate.pinnedAtUtc || "")
    };
  }).filter((candidate) => candidate.text).slice(0, AI_KEYWORD_HISTORY_MAX);
}
function cloneItems(items) { return items.map((item) => ({ ...item, keywords: [...(item.keywords || [])], keywordCandidates: cloneKeywordCandidates(item.keywordCandidates) })); }

function createDay(seedItems = []) {
  return { title: "", camera: { ...DEFAULT_CAMERA }, pasteSequence: 0, items: cloneItems(seedItems), trash: [] };
}

function loadState() {
  const todayId = dateKeyFromDate(new Date());
  const fallback = { activeDayId: todayId, viewMode: "day", surface: "quiet", days: { [todayId]: createDay(initialItems) }, selectedId: "img-01", activeKeywordId: null, expandedNoteId: null, dragHarness: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.days) return normalizeState({ ...fallback, ...saved });
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "{}");
    if (legacy.items) {
      const legacyDayId = legacy.activeDate ? String(legacy.activeDate).slice(0, 10) : todayId;
      return normalizeState({
        activeDayId: legacyDayId,
        surface: legacy.surface || "quiet",
        days: { [legacyDayId]: { title: legacy.customTitle || "", camera: { ...DEFAULT_CAMERA, ...(legacy.camera || {}) }, pasteSequence: legacy.pasteSequence || 0, items: legacy.items } },
        selectedId: legacy.selectedId || null,
        activeKeywordId: legacy.activeKeywordId || null,
        expandedNoteId: legacy.expandedNoteId || null,
        dragHarness: []
      });
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function normalizeState(value) {
  value.days ||= {};
  value.activeDayId ||= dateKeyFromDate(new Date());
  if (!value.days[value.activeDayId]) value.days[value.activeDayId] = createDay();
  Object.values(value.days).forEach((day) => {
    day.title ||= "";
    day.camera = { ...DEFAULT_CAMERA, ...(day.camera || {}) };
    day.pasteSequence ||= 0;
    day.items = Array.isArray(day.items) ? day.items : [];
    day.items.forEach((item) => {
      item.keywords = Array.isArray(item.keywords) ? item.keywords : [];
      item.keywordCandidates = cloneKeywordCandidates(item.keywordCandidates);
      item.aiKeywordState ||= item.keywordCandidates.some((candidate) => candidate.state === "suggested") ? "suggested" : "idle";
      item.aiKeywordProvider ||= "local-mock";
    });
    day.trash = Array.isArray(day.trash) ? day.trash : [];
    day.trash.forEach((entry) => {
      if (!entry.item) return;
      entry.item.keywords = Array.isArray(entry.item.keywords) ? entry.item.keywords : [];
      entry.item.keywordCandidates = cloneKeywordCandidates(entry.item.keywordCandidates);
    });
  });
  value.viewMode = ["day", "weekly", "monthly"].includes(value.viewMode) ? value.viewMode : "day";
  value.selectedId ??= null;
  value.activeKeywordId ??= null;
  value.expandedNoteId ??= null;
  value.retryQueue = Array.isArray(value.retryQueue) ? value.retryQueue : [];
  value.retrySequence = Number(value.retrySequence || 0);
  value.dragHarness = Array.isArray(value.dragHarness) ? value.dragHarness.slice(0, DRAG_HARNESS_LIMIT) : [];
  return value;
}

function day() {
  if (!state.days[state.activeDayId]) state.days[state.activeDayId] = createDay();
  return state.days[state.activeDayId];
}
function items() { return day().items; }
function trashItems() { return day().trash; }
function camera() { return day().camera; }
function objectMutationPayload(item) {
  return {
    id: item.id,
    kind: item.kind || "image",
    x: item.x,
    y: item.y,
    width: item.width,
    z: item.z,
    locked: Boolean(item.locked),
    note: item.note || "",
    keywords: [...(item.keywords || [])],
    keywordCandidates: cloneKeywordCandidates(item.keywordCandidates),
    aiKeywordState: item.aiKeywordState || "idle",
    aiKeywordProvider: item.aiKeywordProvider || "local-mock",
    lifecycleState: item.lifecycleState || "READY",
    assetId: item.assetId || "",
    sourceUrl: item.sourceUrl || "",
    url: item.url || "",
    src: item.src || "",
    originalSrc: item.originalSrc || "",
    thumbnailSrc: item.thumbnailSrc || "",
    derivativeState: item.derivativeState || "",
    mediaResolution: item.mediaResolution || "",
    importedFromId: item.importedFromId || "",
    importBatchId: item.importBatchId || "",
    mediaRepairState: item.mediaRepairState || ""
  };
}

function applyRecoveredSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || !snapshot.days) return false;
  const recovered = normalizeState({ ...state, ...snapshot });
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, recovered);
  lastAckRevision = Number(recovered.persistenceRevision || 0);
  return true;
}

function applyCaptureRecovery(recovery) {
  if (!recovery?.jobs) return;
  Object.values(recovery.jobs).forEach((job) => {
    let item = findItemAcrossDays(job.id);
    if (!item && job.state === "DURABLE" && job.imageObject) {
      const board = state.days[job.dayCanvasId] || createDay();
      state.days[job.dayCanvasId] = board;
      item = { ...job.imageObject, id: job.imageObject.id || job.id, captureJobId: job.id, kind: job.imageObject.kind || "image", src: job.rendererSrc || job.imageObject.src || "", keywords: [...(job.imageObject.keywords || ["recovered capture"])], keywordCandidates: cloneKeywordCandidates(job.imageObject.keywordCandidates) };
      if (!board.items.some((candidate) => candidate.id === item.id || candidate.captureJobId === job.id)) board.items.push(item);
    }
    if (!item) return;
    item.captureJobId = job.id;
    if (job.state === "DURABLE") {
      item.lifecycleState = "DURABLE";
      item.assetId = job.assetId || item.assetId;
      item.sha256 = job.sha256 || item.sha256;
      item.originalRelpath = job.originalRelpath || item.originalRelpath;
      item.originalSrc = item.assetId ? `app-media://asset/${item.assetId}?variant=original` : item.originalSrc;
      item.thumbnailSrc = item.assetId ? `app-media://asset/${item.assetId}?variant=thumbnail` : item.thumbnailSrc;
      item.src = job.rendererSrc || (item.assetId ? `app-media://asset/${item.assetId}?variant=working` : item.src);
      item.captureError = "";
    }
    if (job.state === "FAILED") {
      item.lifecycleState = "FAILED";
      item.captureError = job.lastErrorCode || item.captureError || "Recovered incomplete capture";
    }
  });
}

function snapshotForPersistence() {
  return JSON.parse(JSON.stringify({ ...state, persistenceRevision: lastAckRevision }, (key, value) => {
    if (["pendingMutationIds", "mutationError", "pendingDataUrl"].includes(key)) return undefined;
    return value;
  }));
}

function makeMutation(type, payload = {}, targetId = null) {
  return { id: `mut-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, type, targetId, dayCanvasId: state.activeDayId, createdAtUtc: new Date().toISOString(), payload };
}

function normalizePersistInput(input = {}) {
  if (input.type) return { immediate: Boolean(input.immediate), mutations: [makeMutation(input.type, input.payload || {}, input.targetId || null)] };
  if (Array.isArray(input.mutations)) return { immediate: Boolean(input.immediate), mutations: input.mutations };
  return { immediate: Boolean(input.immediate), mutations: [makeMutation("snapshot.checkpoint", { reason: input.reason || "renderer-checkpoint" })] };
}

function findItemAcrossDays(id) {
  for (const board of Object.values(state.days || {})) {
    const item = board.items?.find((candidate) => candidate.id === id || candidate.captureJobId === id);
    if (item) return item;
    const trashed = board.trash?.find((entry) => entry.item && (entry.item.id === id || entry.item.captureJobId === id));
    if (trashed?.item) return trashed.item;
  }
  return null;
}
function retryQueue() { state.retryQueue ||= []; return state.retryQueue; }
function retryQueueCount() { return retryQueue().length; }
function failedMutationsForTarget(targetId) { return retryQueue().filter((entry) => entry.mutation.targetId === targetId); }
function removeRetryEntries(ids) {
  if (!ids.length) return;
  state.retryQueue = retryQueue().filter((entry) => !ids.includes(entry.mutation.id));
}
function queueFailedMutations(mutations, error) {
  const message = error || "Persistence ACK failed";
  const existing = new Map(retryQueue().map((entry) => [entry.mutation.id, entry]));
  mutations.forEach((mutation) => {
    const previous = existing.get(mutation.id);
    existing.set(mutation.id, {
      id: mutation.id,
      order: previous?.order || ++retrySequence,
      retryCount: previous?.retryCount || 0,
      dayCanvasId: mutation.dayCanvasId || state.activeDayId,
      targetId: mutation.targetId || null,
      mutation,
      error: message,
      failedAtUtc: new Date().toISOString()
    });
    if (mutation.targetId) {
      const item = findItemAcrossDays(mutation.targetId);
      if (item) item.failedMutationIds = [...new Set([...(item.failedMutationIds || []), mutation.id])];
    }
  });
  state.retryQueue = [...existing.values()].sort((a, b) => a.order - b.order);
  state.retrySequence = retrySequence;
}
function clearFailedMutationMarks(ids) {
  Object.values(state.days || {}).forEach((board) => {
    [...(board.items || []), ...(board.trash || []).map((entry) => entry.item).filter(Boolean)].forEach((item) => {
      if (Array.isArray(item.failedMutationIds)) item.failedMutationIds = item.failedMutationIds.filter((id) => !ids.includes(id));
      if (!item.failedMutationIds?.length) delete item.failedMutationIds;
      if (!failedMutationsForTarget(item.id).length && item.mutationError) item.mutationError = "";
    });
  });
}
function updateConflictIndicator(ack) {
  conflictState.active = Boolean(ack?.conflict);
  conflictState.message = ack?.conflict ? (ack.conflictMessage || "Snapshot revision was older than the latest ACK") : "";
  saveState.classList.toggle("conflict", conflictState.active);
  saveState.title = conflictState.message || saveState.title || "";
}
function retryMutations(entries) {
  if (!entries.length) return;
  entries.forEach((entry) => { entry.retryCount = (entry.retryCount || 0) + 1; entry.lastRetryAtUtc = new Date().toISOString(); });
  persist({ immediate: true, mutations: entries.map((entry) => entry.mutation), retrying: true });
}
function retryObjectMutations(targetId) { retryMutations(failedMutationsForTarget(targetId)); }
function retryAllMutations() { retryMutations([...retryQueue()].sort((a, b) => a.order - b.order)); }
function keepOptimisticObject(targetId) {
  const ids = failedMutationsForTarget(targetId).map((entry) => entry.mutation.id);
  removeRetryEntries(ids);
  clearFailedMutationMarks(ids);
  const item = findItemAcrossDays(targetId);
  if (item) item.mutationError = "";
  persistRetryQueueMetadata();
  saveState.textContent = retryQueueCount() ? "Needs retry" : "Saved";
  renderCanvas();
}

function restoreRetryMetadata(metadata) {
  if (!metadata?.queue) return;
  state.retryQueue = Array.isArray(metadata.queue) ? metadata.queue : [];
  retrySequence = Math.max(Number(metadata.retrySequence || 0), ...state.retryQueue.map((entry) => Number(entry.order || 0)), 0);
  state.retrySequence = retrySequence;
  state.retryQueue.forEach((entry) => {
    if (!entry.targetId && entry.mutation?.targetId) entry.targetId = entry.mutation.targetId;
    if (!entry.dayCanvasId && entry.mutation?.dayCanvasId) entry.dayCanvasId = entry.mutation.dayCanvasId;
    if (!entry.targetId) return;
    const item = findItemAcrossDays(entry.targetId);
    if (!item) return;
    item.failedMutationIds = [...new Set([...(item.failedMutationIds || []), entry.id || entry.mutation?.id])].filter(Boolean);
    item.mutationError = entry.error || item.mutationError || "Persistence ACK failed";
  });
  if (retryQueueCount()) {
    saveState.textContent = "Needs retry";
    saveState.title = retryQueueCount() + " failed save mutations restored";
  }
}

function persistRetryQueueMetadata() {
  state.retrySequence = retrySequence;
  if (!shellBridge?.writeRetryQueue) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshotForPersistence())); } catch {}
    return;
  }
  shellBridge.writeRetryQueue({ queue: retryQueue(), retrySequence }).catch(() => {});
}

function markMutationsPending(mutations) {
  mutations.forEach((mutation) => {
    if (!mutation.targetId) return;
    const item = findItemAcrossDays(mutation.targetId);
    if (!item) return;
    item.pendingMutationIds = [...new Set([...(item.pendingMutationIds || []), mutation.id])];
    item.mutationError = "";
  });
}

function settleMutations(mutationIds = [], error = "") {
  Object.values(state.days || {}).forEach((board) => {
    [...(board.items || []), ...(board.trash || []).map((entry) => entry.item).filter(Boolean)].forEach((item) => {
      if (!Array.isArray(item.pendingMutationIds)) return;
      item.pendingMutationIds = item.pendingMutationIds.filter((id) => !mutationIds.includes(id));
      if (!item.pendingMutationIds.length) delete item.pendingMutationIds;
      if (error) item.mutationError = error;
      else if (!item.pendingMutationIds?.length) item.mutationError = "";
    });
  });
}

function persist(input = {}) {
  const request = normalizePersistInput(input);
  saveState.textContent = "Saving";
  markMutationsPending(request.mutations);
  clearTimeout(saveTimer);
  const delay = request.immediate ? 0 : 220;
  saveTimer = setTimeout(async () => {
    const requestId = ++latestPersistenceRequest;
    const snapshot = snapshotForPersistence();
    if (!shellBridge?.saveWorkspaceMutations) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      lastAckRevision = Number(snapshot.persistenceRevision || 0);
      const mutationIds = request.mutations.map((mutation) => mutation.id);
      settleMutations(mutationIds);
      removeRetryEntries(mutationIds);
      clearFailedMutationMarks(mutationIds);
      persistRetryQueueMetadata();
      updateConflictIndicator(null);
      if (requestId === latestPersistenceRequest) saveState.textContent = retryQueueCount() ? "Needs retry" : "Saved";
      refreshOpenSearch();
      renderCanvas();
      return;
    }
    try {
      const ack = await shellBridge.saveWorkspaceMutations({ schemaVersion: 1, clientId: "renderer", baseRevision: lastAckRevision, mutations: request.mutations, snapshot });
      if (!ack?.ok) throw new Error(ack?.details || ack?.error || "Save failed");
      lastAckRevision = Number(ack.revision || lastAckRevision);
      state.persistenceRevision = lastAckRevision;
      const ackedIds = ack.mutationIds || request.mutations.map((mutation) => mutation.id);
      settleMutations(ackedIds);
      removeRetryEntries(ackedIds);
      clearFailedMutationMarks(ackedIds);
      persistRetryQueueMetadata();
      saveState.title = "";
      updateConflictIndicator(ack);
      if (requestId === latestPersistenceRequest) saveState.textContent = conflictState.active ? "Saved conflict" : retryQueueCount() ? "Needs retry" : "Saved";
      refreshOpenSearch();
      renderCanvas();
    } catch (error) {
      const ids = request.mutations.map((mutation) => mutation.id);
      const message = error?.message || "Persistence ACK failed";
      settleMutations(ids, message);
      queueFailedMutations(request.mutations, message);
      persistRetryQueueMetadata();
      if (requestId === latestPersistenceRequest) {
        saveState.textContent = "Needs retry";
        saveState.title = message + (retryQueueCount() ? ` - ${retryQueueCount()} queued` : "");
      }
      renderCanvas();
    }
  }, delay);
}

function formatMainDate(date) { return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", weekday: "long" }).format(date); }
function formatSecondaryDate(date) { return new Intl.DateTimeFormat("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(date); }
function formatMonthDate(date) { return `${new Intl.DateTimeFormat("en", { month: "long" }).format(date)}, ${date.getFullYear()}`; }
function formatMonthCaps(date) { return formatMonthDate(date).toUpperCase(); }
function shortMonthDay(date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date); }
function weekStartForDate(date) { const started = startOfDay(date); const offset = (started.getDay() + 6) % 7; return new Date(started.getTime() - offset * ONE_DAY); }
function weekDaysForDate(date) { const start = weekStartForDate(date); return Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * ONE_DAY)); }
function formatWeekDate(date) { const days = weekDaysForDate(date); const start = days[0]; const end = days[6]; return `Week of ${shortMonthDay(start)} -${shortMonthDay(end)} , ${end.getFullYear()}`; }
function isOverviewMode() { return state.viewMode === "weekly" || state.viewMode === "monthly"; }
function screenToWorld(clientX, clientY) { const cam = camera(); return { x: (clientX - cam.x) / cam.zoom, y: (clientY - cam.y) / cam.zoom }; }
function dateFromDayId(dayId) {
  const fallback = startOfDay(new Date());
  const match = String(dayId || state.activeDayId || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return fallback;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? fallback : date;
}
function normalizeSearchText(value) { return String(value || "").toLowerCase().replace(/\s+/g, " ").trim(); }
function hostFromUrl(value) { try { return new URL(String(value || "")).host; } catch { return ""; } }
function objectSearchText(item, board, dayId) {
  return [item.kind || "image", item.sourceType || "", item.label || "", item.url || "", item.sourceUrl || "", hostFromUrl(item.url || item.sourceUrl), item.note || "", (item.keywords || []).join(" "), item.capturedAtUtc || item.createdAtUtc || "", dayId, board.title || "", formatMainDate(dateFromDayId(dayId))].join(" ");
}
function buildSearchIndex() {
  const entries = [];
  Object.entries(state.days || {}).forEach(([dayId, board]) => {
    const dayTitle = board.title || formatMainDate(dateFromDayId(dayId));
    entries.push({ id: "day:" + dayId, dayId, type: "day", title: dayTitle, preview: dayId, haystack: normalizeSearchText([dayTitle, dayId, formatSecondaryDate(dateFromDayId(dayId))].join(" ")) });
    (board.items || []).forEach((item) => {
      const title = item.kind === "link" ? (item.label || linkTitleFromUrl(item.url)) : (item.keywords?.[0] || "Image");
      const preview = item.kind === "link" ? [hostFromUrl(item.url), item.note].filter(Boolean).join(" - ") : [item.note, (item.keywords || []).slice(1, 3).join(", ")].filter(Boolean).join(" - ");
      entries.push({ id: item.id, dayId, type: item.kind || "image", title, preview: cleanPreview(preview, 110), item, haystack: normalizeSearchText(objectSearchText(item, board, dayId)) });
    });
  });
  return entries;
}
function mapDurableSearchResult(result) {
  const item = result.type === "day" ? null : findItemAcrossDays(result.id);
  return { ...result, item, haystack: "" };
}
function runLocalSearch(query) {
  const q = normalizeSearchText(query);
  searchState.results = q ? buildSearchIndex().filter((entry) => entry.haystack.includes(q)).slice(0, 80) : [];
  searchState.source = "renderer";
  searchState.selectedIndex = clamp(searchState.selectedIndex, 0, Math.max(searchState.results.length - 1, 0));
  return searchState.results;
}
function runSearch(query) {
  searchState.query = query;
  const results = runLocalSearch(query);
  const q = normalizeSearchText(query);
  if (q && shellBridge?.searchBoard) {
    const requestId = ++durableSearchRequest;
    shellBridge.searchBoard({ query, limit: 80 }).then((response) => {
      if (requestId !== durableSearchRequest || normalizeSearchText(searchState.query) !== q) return;
      if (!response?.ok || !Array.isArray(response.results)) return;
      searchState.results = response.results.map(mapDurableSearchResult);
      searchState.source = response.source || "metadata.sqlite";
      searchState.selectedIndex = clamp(searchState.selectedIndex, 0, Math.max(searchState.results.length - 1, 0));
      const popover = popoverLayer.querySelector(".search-popover");
      if (popover) renderSearchResults(popover);
      renderCanvas();
    }).catch(() => {});
  }
  return results;
}
function decorateSearchState(object, item) {
  const active = Boolean(normalizeSearchText(searchState.query));
  const match = active && searchState.results.some((entry) => entry.dayId === state.activeDayId && entry.id === item.id);
  object.classList.toggle("search-match", match);
  object.classList.toggle("search-dimmed", active && !match);
}
function centerCameraOnItem(item) {
  const cam = camera();
  const width = Number(item.width || 240);
  const height = Number(item.height || width * (item.aspect || 0.75));
  cam.x = Math.round(window.innerWidth / 2 - (item.x + width / 2) * cam.zoom);
  cam.y = Math.round(window.innerHeight / 2 - (item.y + height / 2) * cam.zoom);
  renderCamera();
}
function jumpToSearchResult(result) {
  if (!result) return;
  state.activeDayId = result.dayId;
  state.selectedId = result.type === "day" ? null : result.id;
  state.activeKeywordId = null;
  state.expandedNoteId = result.type === "day" ? null : result.id;
  day(); renderChrome(); renderCanvas();
  const item = result.type === "day" ? null : findItemAcrossDays(result.id);
  if (item) centerCameraOnItem(item);
}
function refreshOpenSearch() {
  const popover = popoverLayer.querySelector(".search-popover");
  if (!popover) return;
  const input = popover.querySelector(".search-input");
  runSearch(input?.value || searchState.query);
  renderSearchResults(popover);
}


function cleanPreview(value, limit = TEXT_PREVIEW_LIMIT) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function extractFirstHttpUrl(value) {
  return String(value || "").match(/https?:\/\/[^\s"\'<>]+/i)?.[0] || "";
}

function summarizeUrl(value) {
  const preview = cleanPreview(value, 220);
  if (!preview) return "";
  try {
    const url = new URL(preview);
    return url.origin + url.pathname;
  } catch {
    return preview;
  }
}

function dataTransferTypes(dataTransfer) {
  return Array.from(dataTransfer?.types || []);
}

function fileSummaries(dataTransfer) {
  return Array.from(dataTransfer?.files || []).map((file) => ({
    name: file.name || "untitled",
    type: file.type || "unknown",
    size: file.size || 0,
    image: Boolean(file.type && file.type.startsWith("image/"))
  }));
}

function dataTransferTypeSamples(dataTransfer) {
  return dataTransferTypes(dataTransfer).map((type) => {
    try {
      const value = dataTransfer?.getData(type) || "";
      return { type, preview: cleanPreview(value, 180), url: summarizeUrl(extractFirstHttpUrl(value)) };
    } catch {
      return { type, preview: "", url: "" };
    }
  }).filter((sample) => sample.preview || sample.url);
}

function hasDropPayload(dataTransfer) {
  const types = dataTransferTypes(dataTransfer).map((type) => type.toLowerCase());
  return fileSummaries(dataTransfer).length > 0 || types.some((type) => ["files", "text/uri-list", "text/plain", "text/html", "text/x-moz-url", "url"].includes(type));
}

function preferredDropEffect(dataTransfer) {
  const effectAllowed = String(dataTransfer?.effectAllowed || "").toLowerCase();
  const types = dataTransferTypes(dataTransfer).map((type) => type.toLowerCase());
  const looksLikeLink = types.some((type) => ["text/uri-list", "text/x-moz-url", "url"].includes(type));
  if (looksLikeLink && (effectAllowed === "all" || effectAllowed === "uninitialized" || effectAllowed.includes("link"))) return "link";
  if (effectAllowed === "all" || effectAllowed === "uninitialized" || effectAllowed.includes("copy") || !effectAllowed) return "copy";
  if (effectAllowed.includes("link")) return "link";
  if (effectAllowed.includes("move")) return "move";
  return "copy";
}

function acceptWindowDrop(event) {
  if (!event.dataTransfer) return false;
  event.preventDefault();
  try { event.dataTransfer.dropEffect = preferredDropEffect(event.dataTransfer); }
  catch { event.dataTransfer.dropEffect = "copy"; }
  boardShell.classList.add("drag-over");
  return true;
}

function dragCandidateFrom(dataTransfer) {
  const files = fileSummaries(dataTransfer);
  const html = dataTransfer?.getData("text/html") || "";
  const htmlImageUrl = firstUrlFromHtml(html);
  const htmlLinkUrl = firstLinkFromHtml(html);
  const uriList = dataTransfer?.getData("text/uri-list") || "";
  const uriUrl = uriList.split(/\r?\n/).find((line) => line && !line.startsWith("#")) || "";
  const mozUrl = extractFirstHttpUrl(dataTransfer?.getData("text/x-moz-url"));
  const legacyUrl = extractFirstHttpUrl(dataTransfer?.getData("URL"));
  const plain = dataTransfer?.getData("text/plain") || "";
  const plainUrl = extractFirstHttpUrl(plain.trim());
  const customSamples = dataTransferTypeSamples(dataTransfer).filter((sample) => !["text/html", "text/uri-list", "text/plain", "text/x-moz-url", "url"].includes(sample.type.toLowerCase()));
  const customUrl = customSamples.find((sample) => sample.url)?.url || "";
  let priority = "none";
  if (files.some((file) => file.image)) priority = "file-image";
  else if (htmlImageUrl) priority = "html-image";
  else if (uriUrl) priority = "uri-list";
  else if (mozUrl) priority = "x-moz-url";
  else if (legacyUrl) priority = "URL";
  else if (plainUrl) priority = "plain-url";
  else if (htmlLinkUrl) priority = "html-link";
  else if (customUrl) priority = "custom-url";
  return {
    priority,
    htmlImageUrl: summarizeUrl(htmlImageUrl),
    htmlLinkUrl: summarizeUrl(htmlLinkUrl),
    uriUrl: summarizeUrl(uriUrl),
    mozUrl: summarizeUrl(mozUrl),
    legacyUrl: summarizeUrl(legacyUrl),
    plainUrl: summarizeUrl(plainUrl),
    customUrl,
    customSamples,
    plainPreview: cleanPreview(plain)
  };
}

function makeDragProbe(stage, event, extra = {}) {
  const world = screenToWorld(event.clientX, event.clientY);
  return {
    id: `drag-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    stage,
    activeDayId: state.activeDayId,
    itemCount: items().length,
    pointer: { screenX: Math.round(event.clientX), screenY: Math.round(event.clientY), worldX: Math.round(world.x), worldY: Math.round(world.y) },
    types: dataTransferTypes(event.dataTransfer),
    files: fileSummaries(event.dataTransfer),
    candidate: dragCandidateFrom(event.dataTransfer),
    ...extra
  };
}

function recordDragHarness(stage, event, extra = {}) {
  const probe = makeDragProbe(stage, event, extra);
  state.dragHarness.unshift(probe);
  state.dragHarness = state.dragHarness.slice(0, DRAG_HARNESS_LIMIT);
  persist({ type: "drag.harness", payload: { stage: probe.stage, priority: probe.candidate?.priority || "none" } });
  if (shellBridge?.recordDragProbe) {
    shellBridge.recordDragProbe(probe).catch(() => {});
  }
  return probe;
}

function pointInsideElement(element, clientX, clientY) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function updateTrashTarget(clientX, clientY) {
  trashButton?.classList.toggle("trash-hot", pointInsideElement(trashButton, clientX, clientY));
}

function clearTrashTarget() {
  trashButton?.classList.remove("trash-hot");
}

function makeTrashId(prefix = "trash") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function previewLabel(value) {
  try { return new URL(value).hostname || value; }
  catch { return value || "Untitled"; }
}

function linkTitleFromUrl(value) {
  try {
    const url = new URL(value);
    const lastPath = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    return lastPath ? lastPath.replace(/[-_]+/g, " ").slice(0, 46) : url.hostname;
  } catch {
    return cleanPreview(value, 46) || "Link";
  }
}

function isLikelyImageUrl(value) {
  return /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#]|$)/i.test(value || "");
}

function addTrashRecord(record) {
  const entry = { trashId: makeTrashId(record.kind || "trash"), trashedAt: new Date().toISOString(), ...record };
  trashItems().unshift(entry);
  saveState.textContent = "Moved to Trash";
  persist({ type: "trash.move", targetId: entry.item?.id || null, payload: { trashId: entry.trashId, kind: entry.kind, label: entry.label || "" } });
  return entry;
}

function moveImageToTrash(id) {
  const currentItems = items();
  const index = currentItems.findIndex((item) => item.id === id);
  if (index < 0) return false;
  const [removed] = currentItems.splice(index, 1);
  const trashKind = removed.kind === "link" ? "link" : "image";
  addTrashRecord({ kind: trashKind, item: { ...removed, keywords: [...(removed.keywords || [])] }, url: removed.url || "", label: removed.label || removed.keywords?.[0] || (trashKind === "link" ? "Link object" : "Image object") });
  if (state.selectedId === id) state.selectedId = null;
  if (state.activeKeywordId === id) state.activeKeywordId = null;
  if (state.expandedNoteId === id) state.expandedNoteId = null;
  renderCanvas();
  return true;
}

async function restoreTrashItem(trashId) {
  const currentTrash = trashItems();
  const index = currentTrash.findIndex((entry) => entry.trashId === trashId);
  if (index < 0) return;
  const [entry] = currentTrash.splice(index, 1);
  if ((entry.kind === "image" || entry.kind === "link") && entry.item) {
    const item = { ...entry.item, keywords: [...(entry.item.keywords || [])] };
    if (items().some((candidate) => candidate.id === item.id)) item.id = `restored-${Date.now()}`;
    item.z = Math.max(...items().map((value) => value.z), 0) + 1;
    items().push(item);
    state.selectedId = item.id;
    renderCanvas();
  }
  if (entry.kind === "external-image" && entry.src) {
    const naturalSize = await imageSizeFromSource(entry.src);
    createCapturedImage(entry.src, naturalSize, "trash-restore", null);
  }
  saveState.textContent = "Restored";
  openActionPopover(trashButton);
  persist({ type: "trash.restore", targetId: entry.item?.id || null, payload: { trashId, kind: entry.kind } });
}

function permanentlyDeleteTrashItem(trashId) {
  const currentTrash = trashItems();
  const index = currentTrash.findIndex((entry) => entry.trashId === trashId);
  if (index < 0) return;
  currentTrash.splice(index, 1);
  saveState.textContent = "Deleted";
  openActionPopover(trashButton);
  persist({ type: "trash.delete", payload: { trashId } });
}

function clearTrash() {
  if (!trashItems().length) return;
  day().trash = [];
  saveState.textContent = "Trash cleared";
  openActionPopover(trashButton);
  persist({ type: "trash.clear", payload: { clearedAt: new Date().toISOString() } });
}

async function storeDropInTrash(event) {
  event.preventDefault();
  event.stopPropagation();
  boardShell.classList.remove("drag-over");
  clearTrashTarget();
  closePopovers();
  recordDragHarness("trash-drop", event, { target: "trash" });
  try {
    const file = [...event.dataTransfer.files].find((candidate) => candidate.type.startsWith("image/"));
    if (file) {
      const src = await readFileAsDataUrl(file);
      addTrashRecord({ kind: "external-image", src, label: file.name || "Dropped image", sourceType: "trash-drop-file" });
      return;
    }
    const htmlImageUrl = firstUrlFromHtml(event.dataTransfer.getData("text/html"));
    const url = firstUrlFromDrop(event.dataTransfer);
    if (!url) throw new Error("No trash candidate");
    if (htmlImageUrl === url || isLikelyImageUrl(url)) {
      addTrashRecord({ kind: "external-image", src: url, label: previewLabel(url), sourceType: "trash-drop-image-url" });
      return;
    }
    addTrashRecord({ kind: "link", url, label: previewLabel(url), sourceType: "trash-drop-link" });
  } catch (error) {
    recordDragHarness("trash-drop-failed", event, { target: "trash", error: error?.message || "Trash drop failed" });
    saveState.textContent = "Trash drop failed";
    setTimeout(() => { saveState.textContent = "Saved"; }, TRASH_FEEDBACK_MS);
  }
}


async function initializeShellBridge() {
  if (!shellBridge) return;
  try { shellState = await shellBridge.getShellState(); }
  catch { shellState = { alwaysOnTop: false }; }
  try {
    if (shellBridge.getProfileState) profileState = await shellBridge.getProfileState();
  } catch {
    profileState = { ready: false, profileLabel: "Profile unavailable", directories: [] };
  }
  try {
    const recovered = await shellBridge.loadWorkspaceSnapshot?.();
    if (recovered?.ok && applyRecoveredSnapshot(recovered.snapshot)) {
      applyCaptureRecovery(recovered.captureRecovery || profileState.captureRecovery);
      restoreRetryMetadata(recovered.retryMetadata);
      saveState.textContent = retryQueueCount() ? "Needs retry" : "Recovered";
    }
  } catch {
    // A missing or failed snapshot keeps the immediate renderer fallback state.
  }
}

async function toggleAlwaysOnTop() {
  if (!shellBridge) return;
  saveState.textContent = "Updating window";
  try {
    shellState = await shellBridge.setAlwaysOnTop(!shellState.alwaysOnTop);
    openActionPopover(document.querySelector('[data-popover="more"]'));
    persist({ type: "workspace.alwaysOnTop", payload: { value: Boolean(shellState.alwaysOnTop) } });
  } catch {
    saveState.textContent = "Window update failed";
    setTimeout(() => { saveState.textContent = "Saved"; }, 1400);
  }
}

function makePopoverButton(label, value, handler, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.disabled = disabled;
  const name = document.createElement("span");
  name.textContent = label;
  const detail = document.createElement("span");
  detail.textContent = value;
  button.append(name, detail);
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  if (handler) button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); handler(event); });
  return button;
}


function createDetailRows(details) {
  const rows = document.createElement("div");
  rows.className = "profile-detail-list";
  details.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "profile-detail-row";
    const name = document.createElement("span");
    name.textContent = label;
    const detail = document.createElement("strong");
    detail.textContent = value;
    row.append(name, detail);
    rows.appendChild(row);
  });
  return rows;
}

function createSettingsSection(titleText, children, copyText = "") {
  const section = document.createElement("section");
  section.className = "settings-section";
  const title = document.createElement("h3");
  title.textContent = titleText;
  section.appendChild(title);
  if (copyText) {
    const copy = document.createElement("p");
    copy.className = "settings-section-copy";
    copy.textContent = copyText;
    section.appendChild(copy);
  }
  children.filter(Boolean).forEach((child) => section.appendChild(child));
  return section;
}

function openDragHarnessPopover(popover) {
  popover.classList.add("harness-popover");
  popover.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = `Drag Harness (${state.dragHarness.length})`;
  popover.appendChild(title);
  if (!state.dragHarness.length) {
    const empty = document.createElement("p");
    empty.className = "diagnostic-empty";
    empty.textContent = "No drag samples yet.";
    popover.appendChild(empty);
    return;
  }
  const list = document.createElement("div");
  list.className = "diagnostic-list";
  state.dragHarness.slice(0, 8).forEach((probe) => {
    const row = document.createElement("article");
    row.className = "diagnostic-entry";
    const head = document.createElement("strong");
    head.textContent = `${probe.stage} / ${probe.candidate?.priority || "none"}`;
    const meta = document.createElement("span");
    const typeCount = probe.types?.length || 0;
    const fileCount = probe.files?.length || 0;
    meta.textContent = `${typeCount} types, ${fileCount} files, @ ${probe.pointer?.worldX || 0}, ${probe.pointer?.worldY || 0}`;
    const candidate = document.createElement("span");
    candidate.textContent = probe.candidate?.htmlImageUrl || probe.candidate?.uriUrl || probe.candidate?.mozUrl || probe.candidate?.legacyUrl || probe.candidate?.plainUrl || probe.candidate?.htmlLinkUrl || probe.candidate?.customUrl || probe.candidate?.customSamples?.[0]?.preview || probe.candidate?.plainPreview || "No preview";
    row.append(head, meta, candidate);
    list.appendChild(row);
  });
  popover.appendChild(list);
}

function openProfilePopover(popover) {
  popover.classList.add("profile-popover");
  popover.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "Profile";
  const rows = document.createElement("div");
  rows.className = "profile-detail-list";
  const details = [
    ["Storage", profileState.profileLabel || "Browser preview"],
    ["Metadata", profileState.metadata?.ready ? "SQLite ready" : profileState.ready ? "File fallback" : "Unavailable"],
    ["Recovery", profileState.captureRecovery?.failed?.length ? `${profileState.captureRecovery.failed.length} failed jobs` : "No pending jobs"],
    ["Restore check", profileState.restoreVerification ? `${profileState.restoreVerification.days} days / ${profileState.restoreVerification.objects} objects` : "Not run"],
    ["Retry queue", retryQueueCount() ? `${retryQueueCount()} pending` : profileState.restoreVerification?.retryQueue ? `${profileState.restoreVerification.retryQueue} stored` : "Empty"],
    ["Remote fetch", profileState.remotePolicy || "HTTP/HTTPS images only"],
    ["AI keywords", profileState.keywordProvider?.modeLabel || "Local mock only"],
    ["Privacy", "Local profile only"]
  ];
  details.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "profile-detail-row";
    const name = document.createElement("span");
    name.textContent = label;
    const detail = document.createElement("strong");
    detail.textContent = value;
    row.append(name, detail);
    rows.appendChild(row);
  });
  const repair = document.createElement("button");
  repair.type = "button";
  repair.textContent = "Repair media index";
  repair.disabled = !shellBridge?.repairMediaIndex;
  repair.addEventListener("click", () => repairMediaIndexFromMenu(popover));
  popover.append(title, rows, repair);
}

async function repairMediaIndexFromMenu(popover = null) {
  if (!shellBridge?.repairMediaIndex) return;
  saveState.textContent = "Repairing media";
  try {
    const result = await shellBridge.repairMediaIndex();
    if (!result?.ok) throw new Error(result?.error || "Repair failed");
    profileState.mediaRepair = result;
    saveState.textContent = `Media repaired: ${result.originals} originals`;
    if (popover) openDataPrivacyPopover(popover);
    else openActionPopover(document.querySelector('[data-popover="more"]'));
  } catch (error) {
    saveState.textContent = "Repair failed";
    saveState.title = error?.message || "Media repair failed";
  }
}

async function exportRestoreFixtureFromMenu(popover) {
  if (!shellBridge?.exportRestoreFixture) return;
  saveState.textContent = "Exporting fixture";
  try {
    const result = await shellBridge.exportRestoreFixture({ snapshot: snapshotForPersistence() });
    if (result?.canceled) { saveState.textContent = "Export canceled"; return; }
    if (!result?.ok) throw new Error(result?.error || "Fixture export failed");
    saveState.textContent = "Fixture exported";
    saveState.title = result.filePath || result.fileName || "";
    openDataPrivacyPopover(popover);
  } catch (error) { saveState.textContent = "Fixture failed"; saveState.title = error?.message || "Fixture export failed"; }
}
async function exportProfileBackupFromMenu(popover) {
  if (!shellBridge?.exportProfileBackup) return;
  saveState.textContent = "Exporting backup";
  try {
    const result = await shellBridge.exportProfileBackup({ snapshot: snapshotForPersistence() });
    if (result?.canceled) { saveState.textContent = "Backup canceled"; return; }
    if (!result?.ok) throw new Error(result?.error || "Backup export failed");
    saveState.textContent = "Backup exported";
    saveState.title = result.filePath || result.fileName || "";
    openDataPrivacyPopover(popover);
  } catch (error) { saveState.textContent = "Backup failed"; saveState.title = error?.message || "Backup export failed"; }
}
async function verifyRestoreProfileFromMenu(popover) {
  if (!shellBridge?.verifyRestoreProfile) return;
  saveState.textContent = "Verifying profile";
  try {
    const result = await shellBridge.verifyRestoreProfile();
    if (!result?.ok) throw new Error(result?.error || "Verify failed");
    profileState.restoreVerification = result;
    saveState.textContent = `Verified ${result.days} days / ${result.objects} objects`;
    saveState.title = `trash ${result.trash}, media ${result.mediaAssets}, capture jobs ${result.captureJobs}, failed ${result.failedCaptureJobs}, retry ${result.retryQueue || 0}`;
    openDataPrivacyPopover(popover);
  } catch (error) { saveState.textContent = "Verify failed"; saveState.title = error?.message || "Verify failed"; }
}
function missingMediaRefsForCurrentDay() {
  return items().filter(isMissingImportedMedia).filter((item) => item.sha256).map((item) => ({
    objectId: item.id,
    importedFromId: item.importedFromId || "",
    sha256: item.sha256,
    dayCanvasId: state.activeDayId,
    imageObject: objectMutationPayload(item)
  }));
}

function createMediaRelinkBatchSummary() {
  const summary = document.createElement("section");
  summary.className = "media-relink-summary";
  const missing = items().filter(isMissingImportedMedia);
  const title = document.createElement("h3");
  title.textContent = "Missing media repair";
  const copy = document.createElement("p");
  copy.textContent = missing.length ? String(missing.length) + " missing on this day. Folder scan matches by SHA-256 before anything is changed." : "No missing imported media on this day.";
  summary.append(title, copy);
  if (mediaRelinkBatchState) {
    const detail = document.createElement("div");
    detail.className = "media-relink-grid";
    [["Scanned", mediaRelinkBatchState.scanned], ["Matched", mediaRelinkBatchState.matched], ["Unmatched", mediaRelinkBatchState.unmatched], ["Folder", mediaRelinkBatchState.folderName || "Chosen folder"]].forEach(([label, value]) => {
      const cell = document.createElement("div");
      const small = document.createElement("span"); small.textContent = label;
      const strong = document.createElement("strong"); strong.textContent = String(value ?? 0);
      cell.append(small, strong);
      detail.appendChild(cell);
    });
    summary.appendChild(detail);
  }
  return summary;
}

async function previewMediaRelinkBatchFromMenu(popover) {
  if (!shellBridge?.previewMediaRelinkBatch) return;
  const refs = missingMediaRefsForCurrentDay();
  if (!refs.length) { saveState.textContent = "No missing media"; openDataPrivacyPopover(popover); return; }
  saveState.textContent = "Choose media folder";
  try {
    const result = await shellBridge.previewMediaRelinkBatch({ refs });
    if (result?.canceled) { saveState.textContent = "Folder scan canceled"; return; }
    if (!result?.ok) throw new Error(result?.error || "Media scan failed");
    mediaRelinkBatchState = result;
    saveState.textContent = "Matched " + result.matched + " / " + result.needed;
    openDataPrivacyPopover(popover);
  } catch (error) {
    saveState.textContent = "Media scan failed";
    saveState.title = error?.message || "Media scan failed";
  }
}

async function applyMediaRelinkBatchFromMenu(popover) {
  if (!shellBridge?.applyMediaRelinkBatch || !mediaRelinkBatchState?.previewId) return;
  saveState.textContent = "Applying media repairs";
  try {
    const result = await shellBridge.applyMediaRelinkBatch({ previewId: mediaRelinkBatchState.previewId });
    if (!result?.ok) throw new Error(result?.error || "Batch repair failed");
    const byId = new Map((result.repairs || []).map((repair) => [repair.objectId, repair]));
    const mutations = [];
    items().forEach((item) => {
      const repair = byId.get(item.id);
      if (!repair) return;
      item.assetId = repair.assetId;
      item.sha256 = repair.sha256;
      item.originalRelpath = repair.originalRelpath;
      item.byteLength = repair.byteLength || item.byteLength || 0;
      item.originalSrc = repair.originalRendererSrc || (repair.assetId ? "app-media://asset/" + repair.assetId + "?variant=original" : item.originalSrc);
      item.thumbnailSrc = repair.thumbnailSrc || (repair.assetId ? "app-media://asset/" + repair.assetId + "?variant=thumbnail" : item.thumbnailSrc);
      item.src = repair.rendererSrc || (repair.assetId ? "app-media://asset/" + repair.assetId + "?variant=working" : item.src);
      item.lifecycleState = "DURABLE";
      item.mediaResolution = "batch-relinked-local";
      item.mediaRepairState = "relinked";
      item.captureError = "";
      mutations.push(makeMutation("media.relink", { assetId: item.assetId, sha256: item.sha256, originalRelpath: item.originalRelpath, mediaResolution: item.mediaResolution, src: item.src, batch: true }, item.id));
    });
    mediaRelinkBatchState = null;
    renderCanvas();
    if (mutations.length) persist({ immediate: true, mutations });
    saveState.textContent = "Repaired " + result.repaired + " media";
    openDataPrivacyPopover(popover);
  } catch (error) {
    saveState.textContent = "Batch repair failed";
    saveState.title = error?.message || "Batch repair failed";
  }
}

function createPrivacyCopy() {
  const copy = document.createElement("p");
  copy.className = "privacy-copy";
  copy.textContent = "Backup includes days, board objects, trash, media references, capture jobs, retry metadata, and rebuildable search metadata. Restore preview is read-only; import-as-new-day adds a separate day and never overwrites your current boards. AI keywords currently use local mock only; external providers require explicit opt-in later.";
  return copy;
}
function createProviderCapabilityList() {
  const providers = profileState.keywordProvider?.providers || [];
  const list = document.createElement("div");
  list.className = "provider-capability-list";
  providers.forEach((provider) => {
    const row = document.createElement("div");
    row.className = "provider-capability-row";
    const name = document.createElement("strong");
    name.textContent = provider.label || provider.id;
    const detail = document.createElement("span");
    const facts = [provider.external ? "external" : "local", provider.canReadImage ? "reads image" : "no image access", provider.canReadText ? "reads text" : "no text access", provider.requiresNetwork ? "network" : "offline"];
    detail.textContent = facts.join(" / ") + (provider.enabled ? "" : " / disabled");
    row.title = provider.description || "";
    row.append(name, detail);
    list.appendChild(row);
  });
  return list;
}

function openDataPrivacyPopover(popover) {
  popover.className = "popover profile-popover privacy-popover";
  popover.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "Data & Privacy";

  const profileReady = profileState.metadata?.ready ? "SQLite ready" : profileState.ready ? "Files ready" : "Browser preview";
  const localRows = createDetailRows([
    ["Profile", profileReady],
    ["Storage", profileState.profileLabel || "Browser preview"],
    ["Recovery", profileState.captureRecovery?.failed?.length ? `${profileState.captureRecovery.failed.length} failed jobs` : "No pending jobs"],
    ["Retry queue", retryQueueCount() ? `${retryQueueCount()} pending` : "Empty"]
  ]);
  const verify = makePopoverButton("Verify data", shellBridge?.verifyRestoreProfile ? "Read only" : "Desktop only", () => verifyRestoreProfileFromMenu(popover), !shellBridge?.verifyRestoreProfile);

  const backup = makePopoverButton("Export profile backup", shellBridge?.exportProfileBackup ? "Save As" : "Desktop only", () => exportProfileBackupFromMenu(popover), !shellBridge?.exportProfileBackup);
  const preview = makePopoverButton("Preview restore JSON", shellBridge?.previewImportJson ? "Read only" : "Desktop only", () => previewImportFromMenu(popover), !shellBridge?.previewImportJson);
  const importNewDay = makePopoverButton("Import as new day", shellBridge?.importJsonAsNewDay ? "Safe add" : "Desktop only", () => importJsonAsNewDayFromMenu(popover), !shellBridge?.importJsonAsNewDay);

  const repairSummary = createMediaRelinkBatchSummary();
  const scanMedia = makePopoverButton("Scan media folder", shellBridge?.previewMediaRelinkBatch ? "SHA match" : "Desktop only", () => previewMediaRelinkBatchFromMenu(popover), !shellBridge?.previewMediaRelinkBatch || !missingMediaRefsForCurrentDay().length);
  const applyMedia = makePopoverButton("Apply matched media", mediaRelinkBatchState?.matched ? String(mediaRelinkBatchState.matched) + " ready" : "Preview first", () => applyMediaRelinkBatchFromMenu(popover), !mediaRelinkBatchState?.matched);
  const repairIndex = makePopoverButton("Repair media index", shellBridge?.repairMediaIndex ? "Rebuild records" : "Desktop only", () => repairMediaIndexFromMenu(popover), !shellBridge?.repairMediaIndex);

  const providerPermissions = profileState.keywordProvider?.permissions || {};
  const providerRows = createDetailRows([
    ["Keyword provider", profileState.keywordProvider?.modeLabel || "Local mock only"],
    ["Consent", profileState.keywordProvider?.consentVersion || "provider-consent-v1"],
    ["Image access", providerPermissions.imageAccess ? "Allowed" : "Off"],
    ["Text access", providerPermissions.textAccess ? "Object text only" : "Off"],
    ["Network", providerPermissions.network ? "Allowed" : "Off"],
    ["External AI", profileState.keywordProvider?.externalProviderEnabled ? "Enabled" : "Off by default"],
    ["Privacy", "Absolute paths omitted"]
  ]);
  const providerList = createProviderCapabilityList();
  const aiProvider = makePopoverButton("External AI provider", "Disabled until explicit consent", null, true);

  const rebuildSearch = makePopoverButton("Rebuild search", shellBridge?.rebuildSearchIndex ? "Local index" : "Desktop only", () => rebuildSearchIndexFromMenu(popover), !shellBridge?.rebuildSearchIndex);
  const fixture = makePopoverButton("Developer fixture", shellBridge?.exportRestoreFixture ? "Export" : "Desktop only", () => exportRestoreFixtureFromMenu(popover), !shellBridge?.exportRestoreFixture);

  const localSection = createSettingsSection("Local Data", [localRows, verify], "Your board is stored locally in this device profile.");
  const backupSection = createSettingsSection("Backup / Restore", [backup, preview, importNewDay], "Backups omit absolute paths. Restore preview is read-only; import adds a separate day.");
  const mediaSection = createSettingsSection("Media Repair", [repairSummary, scanMedia, applyMedia, repairIndex]);
  const aiSection = createSettingsSection("AI Privacy", [providerRows, providerList, aiProvider], "Keyword suggestions use a provider router. This build only runs local mock; external providers cannot be enabled yet.");
  const maintenanceSection = createSettingsSection("Maintenance", [rebuildSearch, fixture], "Developer-safe tools for rebuilding local read models and recovery fixtures.");
  const status = document.createElement("div");
  status.className = "export-status";
  status.textContent = "Data actions stay local unless you choose a file.";
  popover.append(title, localSection, backupSection, mediaSection, aiSection, maintenanceSection, status);
}
async function rebuildSearchIndexFromMenu(popover) {
  if (!shellBridge?.rebuildSearchIndex) return;
  saveState.textContent = "Indexing search";
  try {
    const result = await shellBridge.rebuildSearchIndex();
    if (!result?.ok) throw new Error(result?.error || "Search index rebuild failed");
    saveState.textContent = "Search indexed";
    saveState.title = (result.indexed || 0) + " search rows";
    openDataPrivacyPopover(popover);
  } catch (error) {
    saveState.textContent = "Index failed";
    saveState.title = error?.message || "Search index rebuild failed";
  }
}

function clearImportPreview(popover) { popover.querySelector(".import-preview-detail")?.remove(); }
function renderImportPreviewDetail(popover, result, mode = "preview") {
  clearImportPreview(popover);
  const detail = document.createElement("section");
  detail.className = "import-preview-detail";
  const heading = document.createElement("h3");
  heading.textContent = mode === "imported" ? "Imported as New Day" : "Import Preview";
  const copy = document.createElement("p");
  copy.textContent = mode === "imported" ? "A separate day was added. Existing boards were not overwritten." : "Read-only preview. Import as new day will add a separate day and will not overwrite existing boards.";
  const grid = document.createElement("div");
  grid.className = "import-preview-grid";
  const media = result.mediaResolution || {};
  const rows = [
    ["Title", result.title || result.dayId || "Imported day"],
    ["Objects", String(result.items || 0)],
    ["Trash", String(result.trash || 0)],
    ["Media matched", String(media.matched || 0)],
    ["Media missing", String(media.missing || 0)],
    ["Unsupported", String(media.unsupported || 0)]
  ];
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    row.append(name, strong);
    grid.appendChild(row);
  });
  if (result.unsupportedFields?.length) {
    const unsupported = document.createElement("p");
    unsupported.className = "import-preview-warning";
    unsupported.textContent = "Ignored fields: " + result.unsupportedFields.join(", ");
    detail.append(heading, copy, grid, unsupported);
  } else {
    detail.append(heading, copy, grid);
  }
  const status = popover.querySelector(".export-status");
  if (status) popover.insertBefore(detail, status); else popover.appendChild(detail);
}
async function previewImportFromMenu(popover) {
  if (!shellBridge?.previewImportJson) return;
  clearImportPreview(popover);
  setExportStatus(popover, "Choose a JSON file to preview");
  try {
    const result = await shellBridge.previewImportJson();
    if (result?.canceled) { setExportStatus(popover, "Import preview canceled"); return; }
    if (!result?.ok) throw new Error(result?.error || "Import preview failed");
    renderImportPreviewDetail(popover, result, "preview");
    setExportStatus(popover, "Preview ready - no board state changed");
  } catch (error) {
    setExportStatus(popover, error?.message || "Import preview failed", true);
  }
}

async function importJsonAsNewDayFromMenu(popover) {
  if (!shellBridge?.importJsonAsNewDay) return;
  clearImportPreview(popover);
  setExportStatus(popover, "Choose a JSON file to import as a new day");
  try {
    const result = await shellBridge.importJsonAsNewDay();
    if (result?.canceled) { setExportStatus(popover, "Import canceled"); return; }
    if (!result?.ok) throw new Error(result?.error || "Import failed");
    const recovered = await shellBridge.loadWorkspaceSnapshot?.();
    if (recovered?.ok && applyRecoveredSnapshot(recovered.snapshot)) {
      restoreRetryMetadata(recovered.retryMetadata);
      renderChrome();
      renderCanvas();
    }
    renderImportPreviewDetail(popover, result, "imported");
    const media = result.mediaResolution ? " / media matched " + result.mediaResolution.matched + ", missing " + result.mediaResolution.missing : "";
    setExportStatus(popover, "Imported " + result.items + " objects as " + result.dayId + media);
    saveState.textContent = "Imported";
  } catch (error) {
    setExportStatus(popover, error?.message || "Import failed", true);
    saveState.textContent = "Import failed";
  }
}

function openMorePopover(popover) {
  popover.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "More";
  const status = shellBridge ? (shellState.alwaysOnTop ? "On" : "Off") : "Electron only";
  const always = makePopoverButton("Always-on-top", status, toggleAlwaysOnTop, !shellBridge);
  always.dataset.action = "always-on-top";
  const dragHarness = makePopoverButton("Drag Harness", `${state.dragHarness.length} samples`, () => openDragHarnessPopover(popover));
  const retrySaves = makePopoverButton("Retry failed saves", retryQueueCount() ? `${retryQueueCount()} queued` : "None", retryAllMutations, !retryQueueCount());
  const search = makePopoverButton("Search board", searchState.query ? `${searchState.results.length} matches` : "Ctrl / Cmd + F", () => openSearchPopover(popover));
  const privacy = makePopoverButton("Data & Privacy", shellBridge ? "Backup / AI" : "Desktop only", null, !shellBridge);
  privacy.dataset.action = "data-privacy";
  privacy.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openDataPrivacyPopover(popover); });
  popover.append(title, search, retrySaves, always, dragHarness, privacy);
}
function renderSearchResults(popover) {
  const list = popover.querySelector(".search-results");
  const count = popover.querySelector(".search-count");
  if (!list || !count) return;
  count.textContent = searchState.query ? searchState.results.length + " found" : "Type to search all days";
  list.innerHTML = "";
  if (!searchState.query) return;
  if (!searchState.results.length) { const empty = document.createElement("div"); empty.className = "search-empty"; empty.textContent = "No matches"; list.appendChild(empty); return; }
  searchState.results.forEach((result, index) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "search-result";
    button.classList.toggle("selected", index === searchState.selectedIndex);
    const title = document.createElement("span"); title.className = "search-result-title"; title.textContent = result.title || result.type;
    const meta = document.createElement("span"); meta.className = "search-result-meta"; meta.textContent = [result.dayId, result.type, result.preview].filter(Boolean).join(" - ");
    button.append(title, meta);
    button.addEventListener("click", () => { searchState.selectedIndex = index; jumpToSearchResult(result); renderSearchResults(popover); });
    list.appendChild(button);
  });
}
function openSearchPopover(popover) {
  searchState.open = true; popover.classList.add("search-popover"); popover.innerHTML = "";
  const title = document.createElement("h2"); title.textContent = "Search Board";
  const input = document.createElement("input"); input.className = "search-input"; input.type = "search"; input.placeholder = "Keyword, note, link, date"; input.value = searchState.query;
  const count = document.createElement("div"); count.className = "search-count";
  const list = document.createElement("div"); list.className = "search-results";
  input.addEventListener("input", () => { searchState.selectedIndex = 0; runSearch(input.value); renderSearchResults(popover); renderCanvas(); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); searchState.selectedIndex = clamp(searchState.selectedIndex + 1, 0, Math.max(searchState.results.length - 1, 0)); renderSearchResults(popover); }
    if (event.key === "ArrowUp") { event.preventDefault(); searchState.selectedIndex = clamp(searchState.selectedIndex - 1, 0, Math.max(searchState.results.length - 1, 0)); renderSearchResults(popover); }
    if (event.key === "Enter") { event.preventDefault(); jumpToSearchResult(searchState.results[searchState.selectedIndex]); }
  });
  popover.append(title, input, count, list); runSearch(searchState.query); renderSearchResults(popover); setTimeout(() => input.focus(), 0);
}
function renderChrome() {
  const currentDay = day();
  const date = activeDate();
  if (state.viewMode === "weekly") {
    titleButton.textContent = "Weekly Curation Slate";
    dateLabel.textContent = formatWeekDate(date);
  } else if (state.viewMode === "monthly") {
    titleButton.textContent = "Monthly Inspiration Calendar";
    dateLabel.textContent = formatMonthDate(date);
  } else {
    titleButton.textContent = currentDay.title || formatMainDate(date);
    dateLabel.textContent = formatSecondaryDate(date);
  }
  modeSelector.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === state.viewMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  boardShell.classList.toggle("weekly-mode", state.viewMode === "weekly");
  boardShell.classList.toggle("monthly-mode", state.viewMode === "monthly");
  const surface = surfaces[state.surface] || surfaces.quiet;
  boardShell.style.backgroundImage = surface.image ? `linear-gradient(rgb(244 241 233 / 58%), rgb(244 241 233 / 58%)), url("${surface.image}")` : "linear-gradient(rgb(244 241 233), rgb(244 241 233))";
}

function updateBoardDensityState() {
  const currentItems = items();
  const cam = camera();
  boardShell.classList.toggle("dense-board", currentItems.length >= DENSE_ITEM_THRESHOLD);
  boardShell.classList.toggle("zoomed-out", cam.zoom <= ZOOMED_OUT_THRESHOLD);
  boardShell.dataset.itemCount = String(currentItems.length);
}

function renderCamera() {
  if (isOverviewMode()) {
    canvas.style.transform = "none";
    zoomPercent.textContent = "100%";
    updateBoardDensityState();
    return;
  }
  const cam = camera();
  canvas.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`;
  zoomPercent.textContent = `${Math.round(cam.zoom * 100)}%`;
  updateBoardDensityState();
}

function monthDayId(year, month, dayNumber) {
  return dateKeyFromDate(new Date(year, month, dayNumber));
}

function openDayFromOverview(dayId) {
  state.activeDayId = dayId;
  state.viewMode = "day";
  state.selectedId = null;
  state.activeKeywordId = null;
  state.expandedNoteId = null;
  day();
  renderChrome();
  renderCanvas();
  persist({ type: "day.select", payload: { activeDayId: state.activeDayId, viewMode: state.viewMode } });
}

function itemsForDay(dayId) {
  return (state.days?.[dayId]?.items || []).filter((item) => item && !item.deleted);
}

function monthlyThumbSource(item) {
  return item.thumbnailSrc || item.src || item.originalSrc || "";
}

function createMonthlyCell(dayId, dayNumber) {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "monthly-cell";
  const todayId = dateKeyFromDate(new Date());
  cell.classList.toggle("selected", dayId === state.activeDayId);
  cell.classList.toggle("today", dayId === todayId);
  cell.setAttribute("aria-label", `Open ${formatSecondaryDate(dateFromDayId(dayId))}`);
  const refs = itemsForDay(dayId);
  const dayNumberNode = document.createElement("strong");
  dayNumberNode.className = "monthly-day-number";
  dayNumberNode.textContent = String(dayNumber);
  cell.appendChild(dayNumberNode);
  if (dayId === todayId) {
    const badge = document.createElement("span");
    badge.className = "monthly-today-badge";
    badge.textContent = "Today";
    cell.appendChild(badge);
  }
  if (refs.length) {
    const thumbs = document.createElement("span");
    thumbs.className = "monthly-thumbs";
    refs.slice(0, 3).forEach((item) => {
      const src = monthlyThumbSource(item);
      if (src && item.kind !== "link") {
        const img = document.createElement("img");
        img.className = "monthly-thumb";
        img.src = src;
        img.alt = "";
        thumbs.appendChild(img);
      } else {
        const fallback = document.createElement("span");
        fallback.className = "monthly-thumb monthly-thumb-fallback";
        fallback.textContent = item.kind === "link" ? "L" : "?";
        thumbs.appendChild(fallback);
      }
    });
    const count = document.createElement("span");
    count.className = "monthly-ref-count";
    count.textContent = `${refs.length} Ref${refs.length === 1 ? "" : "s"}`;
    cell.append(thumbs, count);
  } else {
    const empty = document.createElement("span");
    empty.className = "monthly-empty-text";
    empty.textContent = "Empty";
    cell.appendChild(empty);
  }
  cell.addEventListener("pointerdown", (event) => event.stopPropagation());
  cell.addEventListener("click", (event) => {
    event.stopPropagation();
    openDayFromOverview(dayId);
  });
  return cell;
}

function createWeeklyCard(date, index) {
  const dayId = dateKeyFromDate(date);
  const refs = itemsForDay(dayId);
  const card = document.createElement("button");
  card.type = "button";
  card.className = "weekly-card";
  const todayId = dateKeyFromDate(new Date());
  card.classList.toggle("today", dayId === todayId);
  card.setAttribute("aria-label", `Open ${formatSecondaryDate(date)}`);
  card.addEventListener("pointerdown", (event) => event.stopPropagation());
  card.addEventListener("click", (event) => { event.stopPropagation(); openDayFromOverview(dayId); });

  const head = document.createElement("span");
  head.className = "weekly-card-head";
  const weekday = document.createElement("strong");
  weekday.textContent = new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  const label = document.createElement("em");
  label.textContent = shortMonthDay(date);
  head.append(weekday, label);

  const title = document.createElement("span");
  title.className = "weekly-card-title";
  title.textContent = state.days?.[dayId]?.title || "Untitled Board";

  const media = document.createElement("span");
  media.className = "weekly-card-media";
  if (refs.length) {
    const stack = document.createElement("span");
    stack.className = "weekly-thumb-stack";
    refs.slice(0, 3).forEach((item, thumbIndex) => {
      const src = monthlyThumbSource(item);
      const wrap = document.createElement("span");
      wrap.className = "weekly-thumb-sheet";
      wrap.style.setProperty("--thumb-rotate", `${(thumbIndex - 1) * 9}deg`);
      wrap.style.setProperty("--thumb-offset", `${(thumbIndex - 1) * 12}px`);
      if (src && item.kind !== "link") {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        wrap.appendChild(img);
      } else {
        wrap.textContent = item.kind === "link" ? "L" : "?";
      }
      stack.appendChild(wrap);
    });
    media.appendChild(stack);
  } else {
    const empty = document.createElement("span");
    empty.className = "weekly-empty-slate";
    empty.innerHTML = `<span>Empty Slate</span><strong>+</strong>`;
    media.appendChild(empty);
  }

  const foot = document.createElement("span");
  foot.className = "weekly-card-foot";
  const count = document.createElement("strong");
  count.textContent = `${refs.length} Reference${refs.length === 1 ? "" : "s"}`;
  const focus = document.createElement("em");
  focus.textContent = "Focus ->";
  foot.append(count, focus);
  card.append(head, title, media, foot);
  return card;
}

function renderWeeklyCanvas() {
  canvas.classList.add("weekly-slate");
  const board = document.createElement("div");
  board.className = "weekly-board";
  weekDaysForDate(activeDate()).forEach((date, index) => board.appendChild(createWeeklyCard(date, index)));
  canvas.appendChild(board);
}

function renderMonthlyCanvas() {
  canvas.classList.add("monthly-calendar");
  const monthDate = activeDate();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const blankCount = (monthStart.getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const board = document.createElement("div");
  board.className = "monthly-board";
  const head = document.createElement("div");
  head.className = "monthly-board-head";
  const label = document.createElement("h2");
  label.textContent = formatMonthCaps(monthDate);
  const hint = document.createElement("span");
  hint.textContent = "Click any cell to navigate";
  head.append(label, hint);
  const weekdays = document.createElement("div");
  weekdays.className = "monthly-weekdays";
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((name) => {
    const node = document.createElement("span");
    node.textContent = name;
    weekdays.appendChild(node);
  });
  const grid = document.createElement("div");
  grid.className = "monthly-grid";
  for (let i = 0; i < blankCount; i += 1) {
    const blank = document.createElement("div");
    blank.className = "monthly-cell monthly-cell-empty";
    grid.appendChild(blank);
  }
  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) grid.appendChild(createMonthlyCell(monthDayId(year, month, dayNumber), dayNumber));
  board.append(head, weekdays, grid);
  canvas.appendChild(board);
}

function renderCanvas() {
  canvas.innerHTML = "";
  canvas.classList.toggle("weekly-slate", state.viewMode === "weekly");
  canvas.classList.toggle("monthly-calendar", state.viewMode === "monthly");
  if (state.viewMode === "weekly") {
    renderWeeklyCanvas();
    renderCamera();
    return;
  }
  if (state.viewMode === "monthly") {
    renderMonthlyCanvas();
    renderCamera();
    return;
  }
  canvas.classList.remove("weekly-slate", "monthly-calendar");
  items().slice().sort((a, b) => a.z - b.z).forEach((item) => canvas.appendChild(createBoardObject(item)));
  renderCamera();
}

function isMissingImportedMedia(item) { return item?.kind !== "link" && ["missing-reference", "unsupported-reference"].includes(item?.mediaResolution); }

function createBoardObject(item) {
  return item.kind === "link" ? createLinkObject(item) : createImageObject(item);
}

function createImageObject(item) {
  const object = document.createElement("article");
  object.className = "image-object";
  object.dataset.id = item.id;
  object.style.left = `${item.x}px`;
  object.style.top = `${item.y}px`;
  object.style.zIndex = String(item.z);
  object.style.setProperty("--object-width", `${item.width}px`);
  object.classList.toggle("selected", state.selectedId === item.id);
  object.classList.toggle("locked", item.locked);
  object.classList.toggle("keywords-open", state.activeKeywordId === item.id);
  object.classList.toggle("capture-resolving", item.lifecycleState === "RESOLVING");
  object.classList.toggle("capture-localizing", item.lifecycleState === "LOCALIZING");
  object.classList.toggle("capture-reference", item.lifecycleState === "REMOTE_REFERENCE");
  object.classList.toggle("capture-failed", item.lifecycleState === "FAILED");
  object.classList.toggle("capture-durable", item.lifecycleState === "DURABLE" || item.lifecycleState === "ORIGINAL_LOCAL");
  object.classList.toggle("media-missing", isMissingImportedMedia(item));
  object.classList.toggle("mutation-pending", Boolean(item.pendingMutationIds?.length));
  object.classList.toggle("mutation-failed", Boolean(item.mutationError));
  decorateSearchState(object, item);
  object.tabIndex = 0;
  object.setAttribute("role", "group");
  object.setAttribute("aria-label", `${item.keywords?.[0] || "Captured image"}${item.locked ? ", locked" : ""}`);
  object.addEventListener("focus", () => {
    state.selectedId = item.id;
    canvas.querySelectorAll(".image-object").forEach((node) => node.classList.toggle("selected", node.dataset.id === item.id));
  });

  const frame = document.createElement("div");
  frame.className = "image-frame";
  frame.addEventListener("pointerdown", (event) => beginMove(event, item));
  frame.addEventListener("contextmenu", (event) => openContextMenu(event, item));

  const missingMedia = isMissingImportedMedia(item);
  const img = document.createElement("img");
  img.src = item.src || "";
  img.alt = item.keywords[0] || "Captured image";
  img.draggable = false;
  img.addEventListener("load", () => { item.aspect = img.naturalHeight / img.naturalWidth; }, { once: true });
  const missing = createMissingMediaPlaceholder(item);

  const lockMark = document.createElement("span");
  lockMark.className = "lock-mark";
  lockMark.textContent = "Locked";
  const captureMark = document.createElement("span");
  captureMark.className = "capture-state-mark";
  captureMark.textContent = item.mutationError ? "Retry needed" : captureStateLabel(item);
  captureMark.title = item.mutationError || item.captureError || item.derivativeError || "";
  frame.append(createKeywordLayer(item), missingMedia ? missing : img, lockMark, captureMark);
  if (missingMedia) frame.appendChild(createMediaRepairActions(item));
  if (item.lifecycleState === "FAILED") frame.appendChild(createCaptureActions(item));
  if (item.mutationError) frame.appendChild(createMutationActions(item));

  ["nw", "ne", "sw", "se"].forEach((corner) => {
    const handle = document.createElement("span");
    handle.className = `resize-handle ${corner}`;
    handle.dataset.corner = corner;
    handle.addEventListener("pointerdown", (event) => beginResize(event, item));
    frame.appendChild(handle);
  });

  object.append(frame);
  if (item.note || state.selectedId === item.id || state.expandedNoteId === item.id) object.appendChild(createQuickNote(item));
  return object;
}

function createLinkObject(item) {
  const object = document.createElement("article");
  object.className = "image-object link-object";
  object.dataset.id = item.id;
  object.style.left = item.x + "px";
  object.style.top = item.y + "px";
  object.style.zIndex = String(item.z);
  object.style.setProperty("--object-width", item.width + "px");
  object.classList.toggle("selected", state.selectedId === item.id);
  object.classList.toggle("locked", item.locked);
  object.classList.toggle("keywords-open", state.activeKeywordId === item.id);
  object.classList.toggle("mutation-pending", Boolean(item.pendingMutationIds?.length));
  object.classList.toggle("mutation-failed", Boolean(item.mutationError));
  decorateSearchState(object, item);
  object.tabIndex = 0;
  object.setAttribute("role", "group");
  object.setAttribute("aria-label", (item.label || "Captured link") + (item.locked ? ", locked" : ""));
  object.addEventListener("focus", () => {
    state.selectedId = item.id;
    canvas.querySelectorAll(".image-object").forEach((node) => node.classList.toggle("selected", node.dataset.id === item.id));
  });

  const frame = document.createElement("div");
  frame.className = "image-frame link-card";
  frame.addEventListener("pointerdown", (event) => beginMove(event, item));
  frame.addEventListener("contextmenu", (event) => openContextMenu(event, item));

  const mark = document.createElement("span");
  mark.className = "link-mark";
  mark.textContent = "Link";
  const title = document.createElement("strong");
  title.textContent = item.label || linkTitleFromUrl(item.url);
  const host = document.createElement("span");
  host.textContent = previewLabel(item.url);
  const open = document.createElement("button");
  open.type = "button";
  open.textContent = "Open";
  open.addEventListener("pointerdown", (event) => event.stopPropagation());
  open.addEventListener("click", (event) => { event.stopPropagation(); window.open(item.url, "_blank", "noopener"); });
  const lockMark = document.createElement("span");
  lockMark.className = "lock-mark";
  lockMark.textContent = "Locked";
  const mutationMark = document.createElement("span");
  mutationMark.className = "capture-state-mark";
  mutationMark.textContent = item.mutationError ? "Retry needed" : "";
  mutationMark.title = item.mutationError || "";
  frame.append(createKeywordLayer(item), mark, title, host, open, lockMark, mutationMark);
  if (item.mutationError) frame.appendChild(createMutationActions(item));

  ["nw", "ne", "sw", "se"].forEach((corner) => {
    const handle = document.createElement("span");
    handle.className = "resize-handle " + corner;
    handle.dataset.corner = corner;
    handle.addEventListener("pointerdown", (event) => beginResize(event, item));
    frame.appendChild(handle);
  });

  object.append(frame);
  if (item.note || state.selectedId === item.id || state.expandedNoteId === item.id) object.appendChild(createQuickNote(item));
  return object;
}

function keywordConflictEntries(item) {
  const seen = new Set();
  return failedMutationsForTarget(item.id).filter((entry) => String(entry.mutation?.type || "").startsWith("keyword.")).filter((entry) => {
    const key = [entry.mutation?.type, entry.mutation?.payload?.candidateId || entry.mutation?.payload?.keyword || entry.mutation?.id].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function retryKeywordMutations(item) { retryMutations(keywordConflictEntries(item)); }

function keepKeywordOptimisticState(item) {
  const ids = keywordConflictEntries(item).map((entry) => entry.mutation.id);
  removeRetryEntries(ids);
  clearFailedMutationMarks(ids);
  item.mutationError = failedMutationsForTarget(item.id).length ? item.mutationError : "";
  persistRetryQueueMetadata();
  saveState.textContent = retryQueueCount() ? "Needs retry" : "Saved";
  renderCanvas();
}

function createKeywordConflictDetail(item) {
  const conflicts = keywordConflictEntries(item);
  if (!conflicts.length) return null;
  const panel = document.createElement("div");
  panel.className = "keyword-conflict-panel";
  const title = document.createElement("strong");
  title.textContent = "Keyword save needs attention";
  const detail = document.createElement("span");
  detail.textContent = conflicts.map((entry) => String(entry.mutation?.type || "keyword").replace("keyword.", "")).join(" / ");
  detail.title = conflicts.map((entry) => entry.error || entry.mutation?.payload?.error || "Persistence ACK failed").join("; ");
  const actions = document.createElement("div");
  actions.className = "keyword-conflict-actions";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Retry keywords";
  retry.addEventListener("pointerdown", (event) => event.stopPropagation());
  retry.addEventListener("click", (event) => { event.stopPropagation(); retryKeywordMutations(item); });
  const keep = document.createElement("button");
  keep.type = "button";
  keep.textContent = "Keep visible";
  keep.addEventListener("pointerdown", (event) => event.stopPropagation());
  keep.addEventListener("click", (event) => { event.stopPropagation(); keepKeywordOptimisticState(item); });
  actions.append(retry, keep);
  panel.append(title, detail, actions);
  return panel;
}

function keywordGatewayRequest(item, providerId = profileState.keywordProvider?.activeProvider || "local-mock") {
  return {
    provider: providerId,
    requestId: "kw-" + item.id + "-" + Date.now(),
    object: {
      id: item.id,
      kind: item.kind || "image",
      sourceType: item.sourceType || "",
      sourceUrl: item.sourceUrl || item.url || "",
      note: item.note || "",
      keywords: [...(item.keywords || [])]
    }
  };
}
function cleanCandidateText(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 48); }
function localMockKeywordCandidates(item, requestId = "kw-local-" + Date.now()) {
  const host = (() => { try { return new URL(item.sourceUrl || item.url || "").hostname.replace(/^www\./, "").split(/[.-]/); } catch { return []; } })();
  const note = String(item.note || "").split(/[^a-zA-Z0-9]+/).filter((word) => word.length >= 4 && word.length <= 16).slice(0, 4);
  const base = item.kind === "link" ? ["web reference", "source trail", "saved link"] : ["visual memory", "composition note", "material mood", "image reference"];
  const seen = new Set([...(item.keywords || []).map(cleanCandidateText), ...cloneKeywordCandidates(item.keywordCandidates).filter((candidate) => candidate.state === "dismissed").map((candidate) => cleanCandidateText(candidate.text))]);
  const values = [...base, item.sourceType || "", ...host, ...note, ...(item.keywords || []).map((keyword) => keyword + " variation")];
  return values.map(cleanCandidateText).filter(Boolean).filter((text) => { if (seen.has(text)) return false; seen.add(text); return true; }).slice(0, AI_KEYWORD_MAX).map((text, index) => ({ id: requestId + "-cand-" + index, text, confidence: Number((0.82 - index * 0.04).toFixed(2)), source: "local-mock", provider: "local-mock", state: "suggested", createdAtUtc: new Date().toISOString() }));
}
function visibleKeywordCandidates(item) { return cloneKeywordCandidates(item.keywordCandidates).filter((candidate) => candidate.state === "suggested"); }
async function generateKeywordCandidatesForItem(item, regenerate = false) {
  const providerId = profileState.keywordProvider?.activeProvider || "local-mock";
  item.aiKeywordState = "pending";
  item.aiKeywordProvider = providerId;
  if (regenerate) item.keywordCandidates = cloneKeywordCandidates(item.keywordCandidates).filter((candidate) => candidate.state === "accepted");
  renderCanvas();
  const request = keywordGatewayRequest(item, providerId);
  try {
    const response = shellBridge?.generateKeywordCandidates ? await shellBridge.generateKeywordCandidates(request) : { ok: true, candidates: localMockKeywordCandidates(item, request.requestId) };
    if (!response?.ok) throw new Error(response?.error || "KEYWORD_MOCK_FAILED");
    const dismissed = new Set(cloneKeywordCandidates(item.keywordCandidates).filter((candidate) => candidate.state === "dismissed").map((candidate) => candidate.text));
    const fresh = cloneKeywordCandidates(response.candidates).filter((candidate) => !dismissed.has(candidate.text) && !(item.keywords || []).includes(candidate.text));
    item.keywordCandidates = [...cloneKeywordCandidates(item.keywordCandidates).filter((candidate) => ["accepted", "dismissed"].includes(candidate.state)), ...fresh].slice(0, AI_KEYWORD_HISTORY_MAX);
    item.aiKeywordState = fresh.length ? "suggested" : "empty";
    item.aiKeywordError = "";
    state.activeKeywordId = item.id;
    renderCanvas();
    persist({ type: "keyword.candidates", targetId: item.id, payload: { provider: response.provider || providerId, state: item.aiKeywordState, candidates: cloneKeywordCandidates(item.keywordCandidates) } });
  } catch (error) {
    item.aiKeywordState = "failed";
    item.aiKeywordError = error?.message || "Keyword generation failed";
    renderCanvas();
    persist({ type: "keyword.candidates", targetId: item.id, payload: { provider: providerId, state: "failed", error: item.aiKeywordError, candidates: cloneKeywordCandidates(item.keywordCandidates) } });
  }
}
function acceptKeywordCandidate(item, candidate, pin = false) {
  const keyword = String(candidate.text || "").trim();
  if (!keyword) return;
  item.keywords = pin ? [keyword, ...(item.keywords || []).filter((value) => value !== keyword)] : [...(item.keywords || []).filter((value) => value !== keyword), keyword];
  const reviewedAtUtc = new Date().toISOString();
  item.keywordCandidates = cloneKeywordCandidates(item.keywordCandidates).map((entry) => entry.id === candidate.id ? { ...entry, state: "accepted", reviewedAtUtc, acceptedAtUtc: reviewedAtUtc, pinnedAtUtc: pin ? reviewedAtUtc : entry.pinnedAtUtc || "" } : entry);
  item.aiKeywordState = visibleKeywordCandidates(item).length ? "suggested" : "reviewed";
  state.activeKeywordId = item.id;
  renderCanvas();
  persist({ type: "keyword.accept", targetId: item.id, payload: { keyword, pin, keywords: [...item.keywords], candidates: cloneKeywordCandidates(item.keywordCandidates) } });
}
function dismissKeywordCandidate(item, candidate) {
  const reviewedAtUtc = new Date().toISOString();
  item.keywordCandidates = cloneKeywordCandidates(item.keywordCandidates).map((entry) => entry.id === candidate.id ? { ...entry, state: "dismissed", reviewedAtUtc, dismissedAtUtc: reviewedAtUtc } : entry);
  item.aiKeywordState = visibleKeywordCandidates(item).length ? "suggested" : "reviewed";
  renderCanvas();
  persist({ type: "keyword.dismiss", targetId: item.id, payload: { candidateId: candidate.id, keyword: candidate.text, candidates: cloneKeywordCandidates(item.keywordCandidates) } });
}
function createKeywordLayer(item) {
  const layer = document.createElement("div");
  layer.className = "keyword-layer";
  const keywords = item.keywords?.length ? item.keywords : [item.kind === "link" ? "link capture" : "image first"];
  const suggestions = visibleKeywordCandidates(item);
  const folded = document.createElement("button");
  folded.className = "keyword-folded";
  folded.type = "button";
  folded.textContent = suggestions.length ? keywords[0] + " +" + Math.max(keywords.length - 1, 0) + " / " + suggestions.length + " suggested" : keywords[0] + " +" + Math.max(keywords.length - 1, 0);
  folded.title = "Expand keywords";
  folded.addEventListener("pointerdown", (event) => event.stopPropagation());
  folded.addEventListener("click", (event) => { event.stopPropagation(); state.activeKeywordId = state.activeKeywordId === item.id ? null : item.id; renderCanvas(); });
  const expanded = document.createElement("div");
  expanded.className = "keyword-expanded";
  keywords.forEach((keyword, index) => {
    const row = document.createElement("div");
    row.className = "keyword-chip" + (index === 0 ? " pinned" : "");
    const text = document.createElement("span");
    text.className = "keyword-text";
    text.textContent = keyword;
    text.title = "Copy keyword, double click to pin";
    text.addEventListener("pointerdown", (event) => event.stopPropagation());
    text.addEventListener("click", () => copyKeyword(keyword, expanded));
    text.addEventListener("dblclick", () => pinKeyword(item, keyword));
    const pinButton = document.createElement("button");
    pinButton.type = "button";
    pinButton.className = "keyword-pin-button";
    pinButton.ariaLabel = "Pin " + keyword;
    pinButton.title = index === 0 ? "Pinned keyword" : "Pin keyword";
    pinButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l-1 7 4 4v2h-6v4h-2v-4H5v-2l4-4-1-7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    pinButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    pinButton.addEventListener("click", (event) => { event.stopPropagation(); pinKeyword(item, keyword); });
    const button = document.createElement("button");
    button.type = "button";
    button.ariaLabel = "Copy " + keyword;
    button.innerHTML = "<img src=\"" + copyIcon + "\" alt=\"\">";
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", () => copyKeyword(keyword, expanded));
    row.append(text, pinButton, button);
    expanded.appendChild(row);
  });
  const aiPanel = document.createElement("div");
  aiPanel.className = "ai-keyword-panel";
  const aiHead = document.createElement("div");
  aiHead.className = "ai-keyword-head";
  const aiTitle = document.createElement("span");
  aiTitle.textContent = item.aiKeywordState === "pending" ? "Suggesting" : "AI suggestions";
  const generate = document.createElement("button");
  generate.type = "button";
  generate.textContent = suggestions.length ? "Regenerate" : "Suggest";
  generate.title = (profileState.keywordProvider?.privacyLabel || "No remote AI request is made by default") + ". Suggestions never overwrite pinned keywords.";
  generate.disabled = item.aiKeywordState === "pending";
  generate.addEventListener("pointerdown", (event) => event.stopPropagation());
  generate.addEventListener("click", (event) => { event.stopPropagation(); generateKeywordCandidatesForItem(item, suggestions.length > 0); });
  aiHead.append(aiTitle, generate);
  aiPanel.appendChild(aiHead);
  if (item.aiKeywordState === "failed") {
    const failed = document.createElement("span");
    failed.className = "ai-keyword-empty";
    failed.textContent = "Keyword provider failed";
    failed.title = item.aiKeywordError || "";
    aiPanel.appendChild(failed);
  } else if (!suggestions.length) {
    const empty = document.createElement("span");
    empty.className = "ai-keyword-empty";
    empty.textContent = item.aiKeywordState === "pending" ? "Local mock is preparing candidates" : "No unreviewed suggestions";
    aiPanel.appendChild(empty);
  }
  suggestions.forEach((candidate) => {
    const row = document.createElement("div");
    row.className = "ai-keyword-candidate";
    const text = document.createElement("span");
    text.textContent = candidate.text;
    text.title = "Suggested keyword. Accept or pin to make it searchable.";
    const actions = document.createElement("span");
    actions.className = "ai-keyword-actions";
    const accept = document.createElement("button");
    accept.type = "button";
    accept.textContent = "Accept";
    accept.addEventListener("pointerdown", (event) => event.stopPropagation());
    accept.addEventListener("click", (event) => { event.stopPropagation(); acceptKeywordCandidate(item, candidate, false); });
    const pin = document.createElement("button");
    pin.type = "button";
    pin.textContent = "Pin";
    pin.addEventListener("pointerdown", (event) => event.stopPropagation());
    pin.addEventListener("click", (event) => { event.stopPropagation(); acceptKeywordCandidate(item, candidate, true); });
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("pointerdown", (event) => event.stopPropagation());
    dismiss.addEventListener("click", (event) => { event.stopPropagation(); dismissKeywordCandidate(item, candidate); });
    actions.append(accept, pin, dismiss);
    row.append(text, actions);
    aiPanel.appendChild(row);
  });
  const keywordConflict = createKeywordConflictDetail(item);
  if (keywordConflict) expanded.appendChild(keywordConflict);
  expanded.appendChild(aiPanel);
  layer.append(folded, expanded);
  return layer;
}
function createQuickNote(item) {
  const note = document.createElement("section");
  note.className = "quick-note";
  note.classList.toggle("expanded", state.expandedNoteId === item.id);
  const text = document.createElement("p");
  text.className = "note-text";
  text.textContent = item.note || "";
  text.addEventListener("pointerdown", (event) => event.stopPropagation());
  text.addEventListener("dblclick", () => editNote(note, item));
  const editor = document.createElement("textarea");
  editor.className = "note-editor";
  editor.value = item.note || "";
  editor.ariaLabel = "Edit quick note";
  editor.placeholder = "Quick note";
  editor.addEventListener("pointerdown", (event) => event.stopPropagation());
  editor.addEventListener("blur", () => { item.note = editor.value.trim(); note.classList.remove("editing"); renderCanvas(); persist({ type: "object.note", targetId: item.id, payload: { note: item.note } }); });
  editor.addEventListener("keydown", (event) => { if (event.key === "Escape" || (event.key === "Enter" && (event.metaKey || event.ctrlKey))) editor.blur(); });
  const toggle = document.createElement("button");
  toggle.className = "note-toggle";
  toggle.type = "button";
  toggle.textContent = state.expandedNoteId === item.id ? "Collapse" : (item.note ? "Expand" : "Add Note");
  toggle.addEventListener("pointerdown", (event) => event.stopPropagation());
  toggle.addEventListener("click", () => { if (!item.note) return editNote(note, item); state.expandedNoteId = state.expandedNoteId === item.id ? null : item.id; renderCanvas(); });
  note.append(text, editor, toggle);
  return note;
}

function editNote(note, item) {
  state.selectedId = item.id;
  note.classList.add("editing", "expanded");
  const editor = note.querySelector(".note-editor");
  requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(editor.value.length, editor.value.length); });
}

async function copyKeyword(keyword, container) {
  try { await navigator.clipboard.writeText(keyword); showLocalFeedback(container, "Copied"); } catch { showLocalFeedback(container, "Copy unavailable"); }
}
function showLocalFeedback(container, message) {
  container.querySelector(".copy-feedback")?.remove();
  const feedback = document.createElement("span");
  feedback.className = "copy-feedback";
  feedback.textContent = message;
  container.appendChild(feedback);
  setTimeout(() => feedback.remove(), 1100);
}
function pinKeyword(item, keyword) { item.keywords = [keyword, ...item.keywords.filter((value) => value !== keyword)]; state.activeKeywordId = item.id; renderCanvas(); persist({ type: "keyword.pin", targetId: item.id, payload: { keyword, keywords: [...item.keywords], candidates: cloneKeywordCandidates(item.keywordCandidates) } }); }

function createMissingMediaPlaceholder(item) {
  const placeholder = document.createElement("div");
  placeholder.className = "missing-media-placeholder";
  const title = document.createElement("strong");
  title.textContent = item.mediaResolution === "unsupported-reference" ? "Unsupported media" : "Missing media";
  const copy = document.createElement("span");
  copy.textContent = item.sha256 ? "Choose the original file to restore this image." : "This imported image has no local media reference.";
  placeholder.append(title, copy);
  return placeholder;
}

function createMediaRepairActions(item) {
  const actions = document.createElement("div");
  actions.className = "media-repair-actions";
  const relink = document.createElement("button");
  relink.type = "button";
  relink.textContent = "Relink file";
  relink.disabled = !shellBridge?.repairImportedMedia || item.mediaRepairState === "pending";
  relink.title = item.sha256 ? "Choose the matching original image file" : "No SHA-256 reference is available";
  relink.addEventListener("pointerdown", (event) => event.stopPropagation());
  relink.addEventListener("click", async (event) => { event.stopPropagation(); await repairImportedMediaForItem(item); });
  const keep = document.createElement("button");
  keep.type = "button";
  keep.textContent = "Keep ref";
  keep.title = "Keep this imported object as a visible reference";
  keep.addEventListener("pointerdown", (event) => event.stopPropagation());
  keep.addEventListener("click", (event) => { event.stopPropagation(); item.mediaRepairState = "kept-reference"; item.captureError = ""; renderCanvas(); persist({ type: "media.relink", targetId: item.id, payload: { state: "kept-reference", mediaResolution: item.mediaResolution || "missing-reference", importedFromId: item.importedFromId || "" } }); });
  actions.append(relink, keep);
  return actions;
}

async function repairImportedMediaForItem(item) {
  if (!shellBridge?.repairImportedMedia) return;
  item.mediaRepairState = "pending";
  item.captureError = "";
  saveState.textContent = "Relinking media";
  renderCanvas();
  try {
    const response = await shellBridge.repairImportedMedia({
      objectId: item.id,
      importedFromId: item.importedFromId || "",
      expectedSha256: item.sha256 || "",
      captureId: "relink-" + item.id + "-" + Date.now(),
      dayCanvasId: state.activeDayId,
      boardDate: state.activeDayId,
      imageObject: objectMutationPayload(item)
    });
    if (response?.canceled) { item.mediaRepairState = "idle"; saveState.textContent = "Relink canceled"; renderCanvas(); return; }
    if (!response?.ok) throw new Error(response?.error || "MEDIA_RELINK_FAILED");
    item.assetId = response.assetId;
    item.sha256 = response.sha256;
    item.originalRelpath = response.originalRelpath;
    item.byteLength = response.byteLength || item.byteLength || 0;
    item.originalSrc = response.originalRendererSrc || (response.assetId ? "app-media://asset/" + response.assetId + "?variant=original" : item.originalSrc);
    item.thumbnailSrc = response.thumbnailSrc || (response.assetId ? "app-media://asset/" + response.assetId + "?variant=thumbnail" : item.thumbnailSrc);
    item.src = response.rendererSrc || (response.assetId ? "app-media://asset/" + response.assetId + "?variant=working" : item.src);
    item.lifecycleState = "DURABLE";
    item.mediaResolution = "relinked-local";
    item.mediaRepairState = "relinked";
    item.captureError = "";
    saveState.textContent = "Media relinked";
    renderCanvas();
    persist({ type: "media.relink", targetId: item.id, payload: { assetId: item.assetId, sha256: item.sha256, originalRelpath: item.originalRelpath, mediaResolution: item.mediaResolution, src: item.src } });
  } catch (error) {
    item.mediaRepairState = "failed";
    item.captureError = error?.message || "Media relink failed";
    saveState.textContent = "Relink failed";
    saveState.title = item.captureError;
    renderCanvas();
    persist({ type: "media.relink", targetId: item.id, payload: { state: "failed", error: item.captureError, mediaResolution: item.mediaResolution || "missing-reference" } });
  }
}

function createMutationActions(item) {
  const actions = document.createElement("div");
  actions.className = "mutation-actions";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Retry save";
  retry.title = item.mutationError || "Retry failed save";
  retry.addEventListener("pointerdown", (event) => event.stopPropagation());
  retry.addEventListener("click", (event) => { event.stopPropagation(); retryObjectMutations(item.id); });
  const keep = document.createElement("button");
  keep.type = "button";
  keep.textContent = "Keep";
  keep.title = "Keep the visible optimistic change and dismiss this retry";
  keep.addEventListener("pointerdown", (event) => event.stopPropagation());
  keep.addEventListener("click", (event) => { event.stopPropagation(); keepOptimisticObject(item.id); });
  actions.append(retry, keep);
  return actions;
}
function createCaptureActions(item) {
  const actions = document.createElement("div");
  actions.className = "capture-actions";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Retry";
  retry.addEventListener("pointerdown", (event) => event.stopPropagation());
  retry.addEventListener("click", async (event) => {
    event.stopPropagation();
    await retryCapture(item);
  });
  const keep = document.createElement("button");
  keep.type = "button";
  keep.textContent = "Keep Reference";
  keep.title = item.captureError || "Keep visible source without localizing";
  keep.addEventListener("pointerdown", (event) => event.stopPropagation());
  keep.addEventListener("click", (event) => {
    event.stopPropagation();
    keepReference(item);
  });
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("pointerdown", (event) => event.stopPropagation());
  remove.addEventListener("click", (event) => {
    event.stopPropagation();
    moveImageToTrash(item.id);
  });
  actions.append(retry, keep, remove);
  return actions;
}

function keepReference(item) {
  item.lifecycleState = new RegExp("^https?://", "i").test(item.src || "") ? "REMOTE_REFERENCE" : "ORIGINAL_LOCAL";
  item.captureError = "";
  item.pendingDataUrl = "";
  saveState.textContent = "Kept as reference";
  renderCanvas();
  persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, keptReference: true } });
}

async function retryCapture(item) {
  item.captureError = "";
  if (item.pendingDataUrl || String(item.src || "").startsWith("data:image/")) {
    const src = item.pendingDataUrl || item.src;
    item.lifecycleState = "LOCALIZING";
    renderCanvas();
    const naturalSize = await imageSizeFromSource(src);
    await commitLocalCapture(item, src, naturalSize, item.sourceType || "retry", { retryOf: item.captureJobId || item.id });
    return;
  }
  if (new RegExp("^https?://", "i").test(item.src || "")) {
    item.lifecycleState = "RESOLVING";
    renderCanvas();
    const naturalSize = await imageSizeFromSource(item.src);
    item.width = comfortableInitialWidth(naturalSize.width, naturalSize.height);
    await localizeRemoteCapture(item, item.src, naturalSize, { retryOf: item.captureJobId || item.id });
    return;
  }
  item.captureError = "No retry source available";
  persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, error: item.captureError, retry: true } });
  renderCanvas();
}

function captureStateLabel(item) {
  if (isMissingImportedMedia(item)) return item.mediaRepairState === "failed" ? "Relink failed" : "Missing media";
  if (item.lifecycleState === "RESOLVING") return "Resolving";
  if (item.lifecycleState === "LOCALIZING") return "Localizing";
  if (item.lifecycleState === "REMOTE_REFERENCE") return "Reference";
  if (item.lifecycleState === "FAILED") return "Failed";
  if (item.lifecycleState === "DURABLE") return "Durable";
  if (item.lifecycleState === "ORIGINAL_LOCAL") return "Local";
  return "";
}

function beginPan(event) {
  if (event.button !== 1 || isOverviewMode()) return;
  const startedInsidePopover = Boolean(event.target.closest(".popover"));
  if (!startedInsidePopover && event.target.closest(".title-area,.action-bar,.temporal-controls,.view-controls,.keyword-layer,.quick-note,.resize-handle")) return;
  event.preventDefault(); event.stopPropagation();
  if (!startedInsidePopover) closePopovers();
  boardShell.classList.add("panning");
  const cam = camera();
  dragIntent = { type: "pan", origin: { pointerX: event.clientX, pointerY: event.clientY, cameraX: cam.x, cameraY: cam.y } };
  try { boardShell.setPointerCapture(event.pointerId); } catch {}
  document.addEventListener("pointermove", continuePointer);
  document.addEventListener("pointerup", endPointer, { once: true });
}
function beginMove(event, item) {
  if (event.button !== 0 || event.target.closest(".keyword-layer,.resize-handle")) return;
  event.stopPropagation(); state.selectedId = item.id; state.activeKeywordId = null; clearTrashTarget();
  if (item.locked) { renderCanvas(); return; }
  dragIntent = { type: "move", item, origin: { pointerX: event.clientX, pointerY: event.clientY, x: item.x, y: item.y } };
  canvas.querySelectorAll(".image-object").forEach((node) => node.classList.toggle("selected", node.dataset.id === item.id));
  event.currentTarget.setPointerCapture(event.pointerId);
  document.addEventListener("pointermove", continuePointer);
  document.addEventListener("pointerup", endPointer, { once: true });
}
function beginResize(event, item) {
  if (item.locked) return;
  event.stopPropagation(); state.selectedId = item.id; state.activeKeywordId = null; clearTrashTarget();
  const object = canvas.querySelector(`[data-id="${item.id}"]`);
  const frameRect = object.querySelector(".image-frame").getBoundingClientRect();
  const cam = camera();
  const width = frameRect.width / cam.zoom;
  const height = frameRect.height / cam.zoom;
  dragIntent = { type: "resize", item, corner: event.currentTarget.dataset.corner, origin: { startWorld: screenToWorld(event.clientX, event.clientY), x: item.x, y: item.y, width, height } };
  object.classList.add("resizing", "selected");
  event.currentTarget.setPointerCapture(event.pointerId);
  document.addEventListener("pointermove", continuePointer);
  document.addEventListener("pointerup", endPointer, { once: true });
}
function continuePointer(event) {
  if (!dragIntent) return;
  const { item, origin } = dragIntent;
  const cam = camera();
  if (dragIntent.type === "pan") { cam.x = Math.round(origin.cameraX + event.clientX - origin.pointerX); cam.y = Math.round(origin.cameraY + event.clientY - origin.pointerY); renderCamera(); return; }
  if (dragIntent.type === "move") { item.x = Math.round(origin.x + (event.clientX - origin.pointerX) / cam.zoom); item.y = Math.round(origin.y + (event.clientY - origin.pointerY) / cam.zoom); }
  if (dragIntent.type === "resize") {
    const world = screenToWorld(event.clientX, event.clientY);
    const signX = dragIntent.corner.includes("e") ? 1 : -1;
    const signY = dragIntent.corner.includes("s") ? 1 : -1;
    const scaleX = 1 + ((world.x - origin.startWorld.x) * signX) / origin.width;
    const scaleY = 1 + ((world.y - origin.startWorld.y) * signY) / origin.height;
    const scale = clamp((scaleX + scaleY) / 2, 160 / origin.width, 540 / origin.width);
    const newWidth = Math.round(origin.width * scale);
    const newHeight = origin.height * scale;
    item.width = newWidth;
    if (dragIntent.corner.includes("w")) item.x = Math.round(origin.x + origin.width - newWidth);
    if (dragIntent.corner.includes("n")) item.y = Math.round(origin.y + origin.height - newHeight);
    if (dragIntent.corner.includes("e")) item.x = origin.x;
    if (dragIntent.corner.includes("s")) item.y = origin.y;
  }
  const node = canvas.querySelector(`[data-id="${item.id}"]`);
  if (node) { node.style.left = `${item.x}px`; node.style.top = `${item.y}px`; node.style.setProperty("--object-width", `${item.width}px`); node.classList.add(dragIntent.type === "resize" ? "resizing" : "dragging"); }
  if (dragIntent.type === "move") updateTrashTarget(event.clientX, event.clientY);
}
function endPointer(event) {
  if (!dragIntent) return;
  const completedIntent = dragIntent;
  const shouldDelete = completedIntent.type === "move" && pointInsideElement(trashButton, event.clientX, event.clientY);
  boardShell.classList.remove("panning");
  clearTrashTarget();
  dragIntent = null;
  document.removeEventListener("pointermove", continuePointer);
  if (shouldDelete) {
    moveImageToTrash(completedIntent.item.id);
    return;
  }
  if (completedIntent.type === "move") completedIntent.item.z = Math.max(...items().map((item) => item.z), 0) + 1;
  renderCanvas();
  if (completedIntent.type === "move") persist({ type: "object.move", targetId: completedIntent.item.id, payload: { x: completedIntent.item.x, y: completedIntent.item.y, z: completedIntent.item.z } });
  else if (completedIntent.type === "resize") persist({ type: "object.resize", targetId: completedIntent.item.id, payload: { x: completedIntent.item.x, y: completedIntent.item.y, width: completedIntent.item.width } });
  else persist({ type: "camera.update", payload: { camera: { ...camera() } } });
}

function getSelectedItem() {
  return items().find((item) => item.id === state.selectedId) || null;
}

function zoomAtViewportCenter(multiplier) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const before = screenToWorld(centerX, centerY);
  const cam = camera();
  const nextZoom = clamp(cam.zoom * multiplier, MIN_ZOOM, MAX_ZOOM);
  cam.x = Math.round(centerX - before.x * nextZoom);
  cam.y = Math.round(centerY - before.y * nextZoom);
  cam.zoom = Number(nextZoom.toFixed(3));
  renderCamera();
  persist({ type: "camera.update", payload: { camera: { ...camera() }, source: "keyboard" } });
}

function moveSelectedByKeyboard(event) {
  const item = getSelectedItem();
  if (!item) return false;
  if (item.locked) {
    saveState.textContent = "Locked";
    setTimeout(() => { saveState.textContent = "Saved"; }, TRASH_FEEDBACK_MS);
    return true;
  }
  const step = event.shiftKey ? 48 : 12;
  const vector = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
  if (!vector) return false;
  item.x += vector[0];
  item.y += vector[1];
  item.z = Math.max(...items().map((value) => value.z), 0) + 1;
  renderCanvas();
  persist({ type: "object.move", targetId: item.id, payload: { x: item.x, y: item.y, z: item.z, keyboard: true } });
  return true;
}

function handleGlobalKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") { event.preventDefault(); const trigger = document.querySelector('[data-popover="more"]'); if (trigger) { openActionPopover(trigger); const popover = popoverLayer.querySelector(".popover"); if (popover) openSearchPopover(popover); } return; }
  if (event.target.closest("input,textarea,[contenteditable='true']")) return;
  if (event.key === "Escape") {
    state.activeKeywordId = null;
    closePopovers();
    renderCanvas();
    return;
  }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && getSelectedItem()) {
    event.preventDefault();
    moveSelectedByKeyboard(event);
    return;
  }
  if ((event.key === "Delete" || event.key === "Backspace") && getSelectedItem()) {
    event.preventDefault();
    moveImageToTrash(state.selectedId);
    return;
  }
  if ((event.key === "+" || event.key === "=") && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    zoomAtViewportCenter(1.12);
    return;
  }
  if (event.key === "-" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    zoomAtViewportCenter(1 / 1.12);
    return;
  }
  if (event.key === "0" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    resetCamera();
  }
}
function handleWheelZoom(event) {
  if (isOverviewMode() || event.target.closest(".title-area,.action-bar,.temporal-controls,.popover,.view-controls")) return;
  event.preventDefault(); closePopovers();
  const before = screenToWorld(event.clientX, event.clientY);
  const cam = camera();
  const nextZoom = clamp(cam.zoom * Math.exp(-event.deltaY * 0.001), MIN_ZOOM, MAX_ZOOM);
  cam.x = Math.round(event.clientX - before.x * nextZoom);
  cam.y = Math.round(event.clientY - before.y * nextZoom);
  cam.zoom = Number(nextZoom.toFixed(3));
  renderCamera(); persist({ type: "camera.update", payload: { camera: { ...camera() }, source: "wheel" } });
}
function resetCamera() {
  if (isOverviewMode()) { saveState.textContent = state.viewMode === "weekly" ? "Weekly view" : "Monthly view"; setTimeout(() => { saveState.textContent = "Saved"; }, TRASH_FEEDBACK_MS); return; }
  day().camera = { ...DEFAULT_CAMERA }; renderCamera(); persist({ type: "camera.reset", payload: { camera: { ...day().camera } } });
}

function comfortableInitialWidth(naturalWidth, naturalHeight) {
  const cam = camera();
  const maxWidth = Math.min(380, window.innerWidth * 0.34 / cam.zoom);
  const maxHeight = Math.min(420, window.innerHeight * 0.52 / cam.zoom);
  return Math.round(clamp(naturalWidth * Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1), 170, 420));
}
function imageSizeFromSource(src) { return new Promise((resolve) => { const image = new Image(); image.onload = () => resolve({ width: image.naturalWidth || 280, height: image.naturalHeight || 210 }); image.onerror = () => resolve({ width: 280, height: 210 }); image.src = src; }); }
function readFileAsDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); }

function createCapturedImage(src, naturalSize, sourceType, worldPoint = null, options = {}) {
  const currentDay = day();
  const width = comfortableInitialWidth(naturalSize.width, naturalSize.height);
  const height = width * (naturalSize.height / naturalSize.width);
  const center = worldPoint || screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
  const offset = (currentDay.pasteSequence % 6) * CAPTURE_MICRO_OFFSET;
  const id = options.id || `${sourceType}-${Date.now()}-${currentDay.pasteSequence}`;
  const item = {
    id,
    kind: "image",
    src,
    sourceType,
    capturedAt: new Date().toISOString(),
    x: Math.round(center.x - width / 2 + offset),
    y: Math.round(center.y - height / 2 + offset),
    width,
    z: Math.max(...items().map((value) => value.z), 0) + 1,
    locked: false,
    keywords: sourceType === "remote-url" ? ["remote image", "image first", "url capture", "visual capture", "quiet archive"] : sourceType === "browser-drag" ? ["browser drag", "image first", "drop position", "visual capture", "quiet archive"] : ["clipboard paste", "image first", "unsorted reference", "visual capture", "quiet archive"],
    note: "",
    lifecycleState: options.lifecycleState || "READY",
    captureError: "",
    captureJobId: options.captureJobId || id,
    pendingDataUrl: String(src || "").startsWith("data:image/") ? src : "",
    sourceUrl: options.sourceUrl || "",
    keywordCandidates: [],
    aiKeywordState: "idle",
    aiKeywordProvider: "local-mock"
  };
  currentDay.items.push(item);
  currentDay.pasteSequence += 1;
  state.selectedId = id; state.activeKeywordId = null; state.expandedNoteId = null;
  renderCanvas(); persist({ type: "object.createImage", targetId: item.id, payload: objectMutationPayload(item), immediate: true });
  return item;
}

function createCapturedLink(url, worldPoint = null) {
  const currentDay = day();
  const center = worldPoint || screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
  const offset = (currentDay.pasteSequence % 6) * CAPTURE_MICRO_OFFSET;
  const id = "link-drag-" + Date.now() + "-" + currentDay.pasteSequence;
  const item = {
    id,
    kind: "link",
    url,
    label: linkTitleFromUrl(url),
    sourceType: "browser-drag-link",
    capturedAt: new Date().toISOString(),
    x: Math.round(center.x - 130 + offset),
    y: Math.round(center.y - 58 + offset),
    width: 260,
    z: Math.max(...items().map((value) => value.z), 0) + 1,
    locked: false,
    keywords: ["link capture", previewLabel(url), "browser drag", "reference trail", "quiet archive"],
    note: "",
    keywordCandidates: [],
    aiKeywordState: "idle",
    aiKeywordProvider: "local-mock"
  };
  currentDay.items.push(item);
  currentDay.pasteSequence += 1;
  state.selectedId = id; state.activeKeywordId = null; state.expandedNoteId = null;
  renderCanvas(); persist({ type: "object.createLink", targetId: item.id, payload: objectMutationPayload(item), immediate: true });
}

function firstUrlFromHtml(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const img = doc.querySelector("img[src]");
  return img?.src || "";
}
function firstLinkFromHtml(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const anchor = doc.querySelector("a[href]");
  return anchor?.href || "";
}
function firstUrlFromDrop(dataTransfer) {
  const uri = dataTransfer.getData("text/uri-list").split(/\r?\n/).find((line) => line && !line.startsWith("#"));
  if (uri) return uri;
  const mozUrl = extractFirstHttpUrl(dataTransfer.getData("text/x-moz-url"));
  if (mozUrl) return mozUrl;
  const legacyUrl = extractFirstHttpUrl(dataTransfer.getData("URL"));
  if (legacyUrl) return legacyUrl;
  const plainUrl = extractFirstHttpUrl(dataTransfer.getData("text/plain"));
  if (plainUrl) return plainUrl;
  const html = dataTransfer.getData("text/html");
  const htmlUrl = firstUrlFromHtml(html) || firstLinkFromHtml(html);
  if (htmlUrl) return htmlUrl;
  return dataTransferTypeSamples(dataTransfer).find((sample) => sample.url)?.url || "";
}

function captureImageObjectPayload(item, naturalSize, lifecycleState = "DURABLE") {
  const height = item.width * ((naturalSize.height || 1) / (naturalSize.width || 1));
  return { id: item.id, sourceType: item.sourceType || "remote-url", sourceUrl: item.sourceUrl || item.src || "", capturedAt: item.capturedAt, x: item.x, y: item.y, width: item.width, height, z: item.z, locked: item.locked, note: item.note, keywords: item.keywords, keywordCandidates: cloneKeywordCandidates(item.keywordCandidates), lifecycleState, revision: 1 };
}
function applyLocalizedCaptureResponse(item, response) {
  item.assetId = response.assetId;
  item.sha256 = response.sha256;
  item.originalRelpath = response.originalRelpath;
  item.byteLength = response.byteLength;
  item.captureJobId = response.captureJob?.id || item.captureJobId || item.id;
  item.pendingDataUrl = "";
  item.originalSrc = response.originalRendererSrc || (response.assetId ? `app-media://asset/${response.assetId}?variant=original` : item.originalSrc);
  item.thumbnailSrc = response.thumbnailSrc || (response.assetId ? `app-media://asset/${response.assetId}?variant=thumbnail` : item.thumbnailSrc);
  item.derivativeState = response.variants?.working?.state || "ready";
  item.derivativeError = response.variants?.working?.errorCode || "";
  item.src = response.rendererSrc || (response.assetId ? `app-media://asset/${response.assetId}?variant=working` : item.src);
  item.lifecycleState = response.persistence?.ok ? "DURABLE" : "ORIGINAL_LOCAL";
  item.captureError = response.persistence?.ok ? "" : (response.persistence?.error || "SQLite unavailable");
  saveState.textContent = response.persistence?.ok ? "Saved" : "Saved local";
}
async function localizeRemoteCapture(item, url, naturalSize, candidateManifest = {}) {
  if (!shellBridge?.localizeRemoteImage) {
    item.lifecycleState = "REMOTE_REFERENCE";
    item.captureError = "";
    renderCanvas();
    persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, src: item.src, localize: false } });
    return;
  }
  item.lifecycleState = "LOCALIZING";
  item.captureError = "";
  renderCanvas();
  try {
    item.captureJobId = item.captureJobId || "remote-" + Date.now() + "-" + Math.random().toString(16).slice(2, 7);
    const response = await shellBridge.localizeRemoteImage({
      captureId: item.captureJobId,
      dayCanvasId: state.activeDayId,
      boardDate: state.activeDayId,
      sourceType: "remote-url",
      url,
      pixelWidth: naturalSize.width || 0,
      pixelHeight: naturalSize.height || 0,
      imageObject: captureImageObjectPayload(item, naturalSize, "DURABLE"),
      candidateManifest: { ...candidateManifest, sourceUrl: url }
    });
    if (!response?.ok) throw new Error(response?.error || "REMOTE_LOCALIZE_FAILED");
    applyLocalizedCaptureResponse(item, response);
  } catch (error) {
    item.lifecycleState = "FAILED";
    item.captureError = error?.message || "Remote localize failed";
    saveState.textContent = "Kept remote reference";
  }
  renderCanvas();
  persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, assetId: item.assetId || "", error: item.captureError || "", captureJobId: item.captureJobId || item.id, src: item.src } });
}
async function commitLocalCapture(item, dataUrl, naturalSize, sourceType, candidateManifest = {}) {
  if (!shellBridge?.commitCapturedMedia) return;
  item.lifecycleState = "LOCALIZING";
  renderCanvas();
  try {
    const height = item.width * ((naturalSize.height || 1) / (naturalSize.width || 1));
    item.captureJobId = item.captureJobId || item.id;
    const response = await shellBridge.commitCapturedMedia({
      captureId: item.captureJobId || item.id,
      dayCanvasId: state.activeDayId,
      boardDate: state.activeDayId,
      sourceType,
      dataUrl,
      pixelWidth: naturalSize.width || 0,
      pixelHeight: naturalSize.height || 0,
      imageObject: {
        id: item.id,
        sourceType,
        capturedAt: item.capturedAt,
        x: item.x,
        y: item.y,
        width: item.width,
        height,
        z: item.z,
        locked: item.locked,
        note: item.note,
        keywords: item.keywords,
        keywordCandidates: cloneKeywordCandidates(item.keywordCandidates),
        lifecycleState: "DURABLE",
        revision: 1
      },
      candidateManifest
    });
    if (!response?.ok) throw new Error(response?.error || "CAPTURE_COMMIT_FAILED");
    item.assetId = response.assetId;
    item.sha256 = response.sha256;
    item.originalRelpath = response.originalRelpath;
    item.byteLength = response.byteLength;
    item.captureJobId = response.captureJob?.id || item.captureJobId || item.id;
    item.pendingDataUrl = "";
    item.originalSrc = response.originalRendererSrc || (response.assetId ? `app-media://asset/${response.assetId}?variant=original` : item.originalSrc);
    item.thumbnailSrc = response.thumbnailSrc || (response.assetId ? `app-media://asset/${response.assetId}?variant=thumbnail` : item.thumbnailSrc);
    item.derivativeState = response.variants?.working?.state || "ready";
    item.derivativeError = response.variants?.working?.errorCode || "";
    item.src = response.rendererSrc || (response.assetId ? `app-media://asset/${response.assetId}?variant=working` : item.src);
    item.lifecycleState = response.persistence?.ok ? "DURABLE" : "ORIGINAL_LOCAL";
    item.captureError = response.persistence?.ok ? "" : (response.persistence?.error || "SQLite unavailable");
    saveState.textContent = response.persistence?.ok ? "Saved" : "Saved local";
  } catch (error) {
    item.lifecycleState = "FAILED";
    item.captureError = error?.message || "Capture commit failed";
    saveState.textContent = "Capture saved on board only";
  }
  renderCanvas();
  persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, assetId: item.assetId || "", error: item.captureError || "", captureJobId: item.captureJobId || item.id } });
}

async function captureFile(file, sourceType, worldPoint) {
  saveState.textContent = sourceType === "browser-drag" ? "Dropping" : "Pasting";
  const src = await readFileAsDataUrl(file);
  const naturalSize = await imageSizeFromSource(src);
  const item = createCapturedImage(src, naturalSize, sourceType, worldPoint, { lifecycleState: shellBridge?.commitCapturedMedia ? "LOCALIZING" : "READY", captureJobId: `capture-${Date.now()}-${Math.random().toString(16).slice(2, 7)}` });
  await commitLocalCapture(item, src, naturalSize, sourceType, { fileName: file.name || "untitled", fileType: file.type || "", byteLength: file.size || 0 });
}
async function captureRemoteUrl(url, worldPoint) {
  saveState.textContent = "Resolving";
  const captureJobId = "remote-" + Date.now() + "-" + Math.random().toString(16).slice(2, 7);
  const item = createCapturedImage(url, { width: 280, height: 210 }, "remote-url", worldPoint, { lifecycleState: "REMOTE_REFERENCE", captureJobId, sourceUrl: url });
  imageSizeFromSource(url).then((naturalSize) => {
    item.width = comfortableInitialWidth(naturalSize.width, naturalSize.height);
    renderCanvas();
    persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, src: item.src, resolved: true } });
    localizeRemoteCapture(item, url, naturalSize, { sourceUrl: url });
  }).catch((error) => {
    item.lifecycleState = "FAILED";
    item.captureError = error?.message || "Remote resolve failed";
    renderCanvas();
    persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, error: item.captureError || "", src: item.src } });
  });
}

async function handlePaste(event) {
  if (event.target.closest("input,textarea,[contenteditable='true']")) return;
  const imageItem = [...(event.clipboardData?.items || [])].find((item) => item.kind === "file" && item.type.startsWith("image/"));
  if (!imageItem) return;
  event.preventDefault(); event.stopPropagation(); closePopovers();
  try { const file = imageItem.getAsFile(); if (!file) throw new Error("No image file"); await captureFile(file, "clipboard-paste", null); }
  catch { saveState.textContent = "Paste failed"; setTimeout(() => { saveState.textContent = "Saved"; }, 1400); }
}
function handleDragOver(event) {
  acceptWindowDrop(event);
}
function handleDragLeave(event) { if (!boardShell.contains(event.relatedTarget)) boardShell.classList.remove("drag-over"); }
async function handleDrop(event) {
  if (event.target.closest(".popover")) return;
  event.preventDefault(); event.stopPropagation(); boardShell.classList.remove("drag-over"); closePopovers();
  const probe = recordDragHarness("drop", event, { target: "canvas" });
  const worldPoint = screenToWorld(event.clientX, event.clientY);
  const file = [...event.dataTransfer.files].find((candidate) => candidate.type.startsWith("image/"));
  try {
    if (file) return await captureFile(file, "browser-drag", worldPoint);
    const url = firstUrlFromDrop(event.dataTransfer);
    if (!url) throw new Error("No drop candidate");
    const candidate = probe.candidate || dragCandidateFrom(event.dataTransfer);
    if (candidate.priority === "html-image" || isLikelyImageUrl(url)) return await captureRemoteUrl(url, worldPoint);
    createCapturedLink(url, worldPoint);
  } catch (error) {
    recordDragHarness("drop-failed", event, { target: "canvas", error: error?.message || "Drop failed" });
    saveState.textContent = "Drop failed";
    setTimeout(() => { saveState.textContent = "Saved"; }, 1400);
  }
}

function shiftDay(days) {
  const current = activeDate();
  state.activeDayId = state.viewMode === "monthly" ? dateKeyFromDate(new Date(current.getFullYear(), current.getMonth() + days, 1)) : state.viewMode === "weekly" ? dateKeyFromDate(new Date(current.getTime() + days * ONE_DAY * 7)) : dateKeyFromDate(new Date(current.getTime() + days * ONE_DAY));
  state.selectedId = null; state.activeKeywordId = null; state.expandedNoteId = null;
  day(); renderChrome(); renderCanvas(); persist({ type: "day.select", payload: { activeDayId: state.activeDayId, viewMode: state.viewMode } });
}

function setViewMode(mode) {
  const nextMode = ["day", "weekly", "monthly"].includes(mode) ? mode : "day";
  state.viewMode = nextMode;
  state.selectedId = null; state.activeKeywordId = null; state.expandedNoteId = null;
  popoverLayer.innerHTML = "";
  renderChrome();
  renderCanvas();
  persist({ type: "day.select", payload: { activeDayId: state.activeDayId, viewMode: state.viewMode } });
}

function openModePopover(event) {
  event.stopPropagation();
  const rect = modeSelector.getBoundingClientRect();
  popoverLayer.innerHTML = "";
  const popover = document.createElement("div");
  popover.className = "popover mode-popover";
  popover.addEventListener("pointerdown", beginPan, { capture: true });
  popover.style.left = `${rect.left}px`;
  popover.style.top = `${rect.bottom + 8}px`;
  const title = document.createElement("h2");
  title.textContent = "View Mode";
  const dayButton = makePopoverButton("Day Canvas", state.viewMode === "day" ? "Current" : "Open", () => setViewMode("day"));
  const weeklyButton = makePopoverButton("Weekly", state.viewMode === "weekly" ? "Current" : "Open", () => setViewMode("weekly"));
  const monthlyButton = makePopoverButton("Monthly", state.viewMode === "monthly" ? "Current" : "Open", () => setViewMode("monthly"));
  popover.append(title, dayButton, weeklyButton, monthlyButton);
  popoverLayer.appendChild(popover);
}

function openContextMenu(event, item) {
  event.preventDefault(); event.stopPropagation(); state.selectedId = item.id; renderCanvas(); popoverLayer.innerHTML = "";
  const menu = document.createElement("div");
  menu.className = "popover";
  menu.style.left = `${Math.min(event.clientX, window.innerWidth - 250)}px`;
  menu.style.top = `${Math.min(event.clientY, window.innerHeight - 190)}px`;
  menu.innerHTML = `<h2>${item.kind === "link" ? "Link" : "Image"}</h2><button type="button" data-action="lock">${item.locked ? "Unlock" : "Lock"}</button><button type="button" data-action="note">Edit Note</button><button type="button" data-action="front">Bring to Front</button>${item.kind === "link" ? `<button type="button" data-action="open">Open Link</button>` : ""}<button type="button" data-action="trash">Move to Trash</button>`;
  menu.querySelector('[data-action="lock"]').addEventListener("click", () => { item.locked = !item.locked; closePopovers(); renderCanvas(); persist({ type: "object.lock", targetId: item.id, payload: { locked: item.locked } }); });
  menu.querySelector('[data-action="note"]').addEventListener("click", () => { closePopovers(); state.expandedNoteId = item.id; renderCanvas(); editNote(canvas.querySelector(`[data-id="${item.id}"] .quick-note`), item); });
  menu.querySelector('[data-action="front"]').addEventListener("click", () => { item.z = Math.max(...items().map((value) => value.z), 0) + 1; closePopovers(); renderCanvas(); persist({ type: "object.zOrder", targetId: item.id, payload: { z: item.z } }); });
  menu.querySelector('[data-action="open"]')?.addEventListener("click", () => { window.open(item.url, "_blank", "noopener"); closePopovers(); });
  menu.querySelector('[data-action="trash"]').addEventListener("click", () => { closePopovers(); moveImageToTrash(item.id); });
  popoverLayer.appendChild(menu);
}

function formatTrashTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function openTrashPopover(popover) {
  popover.classList.add("trash-popover");
  const entries = trashItems();
  const header = document.createElement("div");
  header.className = "trash-header";
  const title = document.createElement("h2");
  title.textContent = `Trash (${entries.length})`;
  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "trash-clear";
  clearButton.textContent = "Clear all";
  clearButton.disabled = entries.length === 0;
  clearButton.addEventListener("click", clearTrash);
  header.append(title, clearButton);
  popover.appendChild(header);

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "trash-empty";
    empty.textContent = "Nothing in Trash";
    popover.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "trash-list";
  entries.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "trash-entry";
    const thumb = document.createElement("div");
    thumb.className = "trash-thumb";
    const src = entry.item?.src || entry.src;
    if (src) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      thumb.appendChild(img);
    } else {
      thumb.textContent = "Link";
    }
    const meta = document.createElement("div");
    meta.className = "trash-meta";
    const label = document.createElement("strong");
    label.textContent = entry.label || entry.item?.keywords?.[0] || previewLabel(entry.url) || "Trash item";
    const detail = document.createElement("span");
    detail.textContent = formatTrashTime(entry.trashedAt);
    meta.append(label, detail);
    const actions = document.createElement("div");
    actions.className = "trash-actions";
    if (["image", "link", "external-image"].includes(entry.kind)) {
      const restore = document.createElement("button");
      restore.type = "button";
      restore.textContent = "Restore";
      restore.addEventListener("click", () => restoreTrashItem(entry.trashId));
      actions.appendChild(restore);
    }
    if (entry.kind === "link" && (entry.url || entry.item?.url)) {
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Open";
      open.addEventListener("click", () => window.open(entry.url || entry.item?.url, "_blank", "noopener"));
      actions.appendChild(open);
    }
    if (entry.item?.mutationError || failedMutationsForTarget(entry.item?.id).length) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Retry save";
      retry.title = entry.item?.mutationError || "Retry failed trash save";
      retry.addEventListener("click", () => retryObjectMutations(entry.item.id));
      actions.appendChild(retry);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "trash-delete";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => permanentlyDeleteTrashItem(entry.trashId));
    actions.appendChild(remove);
    row.append(thumb, meta, actions);
    list.appendChild(row);
  });
  popover.appendChild(list);
}
function exportSafeDayId() { return String(state.activeDayId || "day").replace(/[^0-9a-z-]/gi, "-"); }
function exportFileStamp() { return new Date().toISOString().replace(/[:.]/g, "-"); }
function sanitizeExportItem(item) {
  const copy = { id: item.id, kind: item.kind || "image", x: item.x, y: item.y, width: item.width, z: item.z, locked: Boolean(item.locked), note: item.note || "", keywords: [...(item.keywords || [])], keywordCandidates: cloneKeywordCandidates(item.keywordCandidates), aiKeywordState: item.aiKeywordState || "idle", lifecycleState: item.lifecycleState || "READY", mediaResolution: item.mediaResolution || "", importedFromId: item.importedFromId || "", importBatchId: item.importBatchId || "", mediaRepairState: item.mediaRepairState || "", sourceType: item.sourceType || "", sourceUrl: item.sourceUrl || "", url: item.url || "", label: item.label || "", assetId: item.assetId || "", sha256: item.sha256 || "", originalRelpath: item.originalRelpath || "" };
  if (item.assetId) copy.media = { assetId: item.assetId, variants: { original: "app-media://asset/" + item.assetId + "?variant=original", working: "app-media://asset/" + item.assetId + "?variant=working", thumbnail: "app-media://asset/" + item.assetId + "?variant=thumbnail" } };
  if (item.src && !/^[a-z]:\\|^\\\\/i.test(item.src)) copy.src = item.src;
  return copy;
}
function buildCurrentDayExport() {
  const currentDay = day();
  return { schemaVersion: 1, product: "AestheticBoard", exportedAtUtc: new Date().toISOString(), activeDayId: state.activeDayId, surface: state.surface, day: { title: currentDay.title || "", camera: { ...currentDay.camera }, pasteSequence: currentDay.pasteSequence || 0, itemCount: currentDay.items.length, trashCount: currentDay.trash.length, items: currentDay.items.map(sanitizeExportItem), trash: currentDay.trash.map((entry) => ({ ...entry, item: entry.item ? sanitizeExportItem(entry.item) : null })) } };
}
function itemExportBounds(item) {
  const width = Number(item.width || 240);
  const baseHeight = item.kind === "link" ? 148 : width * Number(item.aspect || 0.75);
  const noteAllowance = item.note ? 96 : 42;
  return {
    left: Number(item.x || 0) - 16,
    top: Number(item.y || 0) - 42,
    right: Number(item.x || 0) + width + 16,
    bottom: Number(item.y || 0) + baseHeight + noteAllowance
  };
}

function currentDayExportBounds() {
  const currentItems = items();
  if (!currentItems.length) return { ok: false, error: "FULL_DAY_EMPTY" };
  const bounds = currentItems.map(itemExportBounds).reduce((acc, box) => ({
    left: Math.min(acc.left, box.left),
    top: Math.min(acc.top, box.top),
    right: Math.max(acc.right, box.right),
    bottom: Math.max(acc.bottom, box.bottom)
  }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
  const padding = 120;
  const width = Math.ceil(bounds.right - bounds.left + padding * 2);
  const height = Math.ceil(bounds.bottom - bounds.top + padding * 2);
  if (width * height > 60 * 1000 * 1000 || width > 10000 || height > 10000) return { ok: false, error: "Full-day export is too large for this pass", width, height };
  return { ok: true, left: bounds.left - padding, top: bounds.top - padding, width, height };
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function exportFullDayPng(popover) {
  const bounds = currentDayExportBounds();
  if (!bounds.ok) { setExportStatus(popover, bounds.error || "Full-day export unavailable", true); return; }
  if (!shellBridge?.captureFullDayPng) { setExportStatus(popover, "Full-day PNG is available in the desktop app", true); return; }
  const cam = camera();
  const previousCamera = { ...cam };
  const previousSelected = state.selectedId;
  const margin = 72;
  const fitZoom = Math.min((window.innerWidth - margin * 2) / bounds.width, (window.innerHeight - margin * 2) / bounds.height, 1);
  if (!Number.isFinite(fitZoom) || fitZoom <= 0.05) { setExportStatus(popover, "Full-day export is too large for this viewport", true); return; }
  const filename = "aesthetic-board-full-day-" + exportSafeDayId() + "-" + exportFileStamp() + ".png";
  setExportStatus(popover, "Framing full day");
  try {
    state.selectedId = null;
    boardShell.classList.add("full-day-exporting");
    cam.zoom = Number(fitZoom.toFixed(3));
    cam.x = Math.round(margin - bounds.left * cam.zoom);
    cam.y = Math.round(margin - bounds.top * cam.zoom);
    renderCanvas();
    await nextFrame();
    const result = await shellBridge.captureFullDayPng({ filename, bounds });
    if (result?.canceled) { setExportStatus(popover, "Export canceled"); return; }
    if (!result?.ok) throw new Error(result?.error || "Full-day PNG export failed");
    setExportStatus(popover, "Saved full-day PNG - " + (result.filePath || result.fileName || filename));
  } catch (error) {
    setExportStatus(popover, error?.message || "Full-day PNG export failed", true);
  } finally {
    Object.assign(cam, previousCamera);
    state.selectedId = previousSelected;
    boardShell.classList.remove("full-day-exporting");
    renderCanvas();
  }
}

function browserDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime }); const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); URL.revokeObjectURL(link.href); link.remove();
}
function setExportStatus(popover, message, failed = false) { const status = popover.querySelector(".export-status"); if (!status) return; status.textContent = message; status.title = message; status.classList.toggle("failed", failed); }
async function exportCurrentDayJson(popover) {
  const filename = "aesthetic-board-" + exportSafeDayId() + "-" + exportFileStamp() + ".json"; const content = JSON.stringify(buildCurrentDayExport(), null, 2); setExportStatus(popover, "Preparing JSON");
  try { if (shellBridge?.writeExportJson) { const result = await shellBridge.writeExportJson({ filename, content }); if (result?.canceled) { setExportStatus(popover, "Export canceled"); return; } if (!result?.ok) throw new Error(result?.error || "JSON export failed"); setExportStatus(popover, "Saved JSON - " + (result.filePath || result.fileName || filename)); } else { browserDownload(filename, content, "application/json"); setExportStatus(popover, "Downloaded JSON in browser"); } } catch (error) { setExportStatus(popover, error?.message || "JSON export failed", true); }
}
async function exportViewportPng(popover) {
  setExportStatus(popover, "Capturing PNG");
  try { if (!shellBridge?.captureViewportPng) throw new Error("PNG capture is available in the desktop app"); const filename = "aesthetic-board-" + exportSafeDayId() + "-" + exportFileStamp() + ".png"; const result = await shellBridge.captureViewportPng({ filename }); if (result?.canceled) { setExportStatus(popover, "Export canceled"); return; } if (!result?.ok) throw new Error(result?.error || "PNG export failed"); setExportStatus(popover, "Saved PNG - " + (result.filePath || result.fileName || filename)); } catch (error) { setExportStatus(popover, error?.message || "PNG export failed", true); }
}
function openExportPopover(popover) {
  popover.classList.add("export-popover"); popover.innerHTML = "";
  const title = document.createElement("h2"); title.textContent = "Download / Share";
  const json = makePopoverButton("Export day JSON", "Local metadata", () => exportCurrentDayJson(popover));
  const png = makePopoverButton("Export viewport PNG", shellBridge?.captureViewportPng ? "Desktop capture" : "Desktop only", () => exportViewportPng(popover), !shellBridge?.captureViewportPng);
  const fullDayPng = makePopoverButton("Export full-day PNG", shellBridge?.captureFullDayPng ? "Whole day" : "Desktop only", () => exportFullDayPng(popover), !shellBridge?.captureFullDayPng);
  const help = document.createElement("p"); help.className = "export-help"; help.textContent = shellBridge ? "Desktop exports open a Save As window so you can choose the folder." : "Browser preview uses your browser download location; the desktop app lets you choose a folder.";
  const status = document.createElement("div"); status.className = "export-status"; status.textContent = "Choose an export format.";
  popover.append(title, help, json, png, fullDayPng, status);
}
function openActionPopover(trigger) {
  const type = trigger.dataset.popover;
  const rect = trigger.getBoundingClientRect();
  popoverLayer.innerHTML = "";
  const popover = document.createElement("div");
  popover.className = "popover";
  popover.addEventListener("pointerdown", beginPan, { capture: true });
  popover.style.left = `${rect.right + 10}px`;
  popover.style.top = `${rect.top}px`;
  if (type === "more") openMorePopover(popover);
  if (type === "journal") popover.innerHTML = `<h2>Journal Gateway</h2><button type="button" disabled>Add selected images</button><button type="button" disabled>Add current day</button><button type="button" disabled>Open Journal Cabinet</button>`;
  if (type === "theme") {
    popover.innerHTML = `<h2>Background Surface</h2>`;
    Object.entries(surfaces).forEach(([id, surface]) => {
      const button = document.createElement("button");
      button.className = "surface-choice";
      button.type = "button";
      button.innerHTML = `<span>${surface.label}</span><span class="surface-state">${surface.status === "default" ? "Default" : surface.status === "experimental" ? "Trial" : ""}</span><span class="surface-swatch" style="background-image:${surface.image ? `url('${surface.image}')` : "none"};background-color:#f4f1e9"></span>`;
      button.classList.toggle("selected-surface", state.surface === id);
      button.addEventListener("click", () => { state.surface = id; closePopovers(); renderChrome(); persist({ type: "surface.change", payload: { surface: id } }); });
      popover.appendChild(button);
    });
  }
  if (type === "export") openExportPopover(popover);
  if (type === "trash") openTrashPopover(popover);
  popoverLayer.appendChild(popover);
}
function closePopovers() { searchState.open = false; searchState.query = ""; searchState.results = []; popoverLayer.innerHTML = ""; renderCanvas(); }

titleButton.addEventListener("click", () => { if (isOverviewMode()) return; titleArea.classList.add("editing"); titleEditor.value = day().title; titleEditor.placeholder = formatMainDate(activeDate()); titleEditor.style.width = `${Math.max(240, titleButton.offsetWidth + 24)}px`; titleEditor.focus(); });
titleEditor.addEventListener("blur", () => { day().title = titleEditor.value.trim(); titleArea.classList.remove("editing"); renderChrome(); persist({ type: "day.title", payload: { title: day().title } }); });
titleEditor.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === "Escape") titleEditor.blur(); });
document.querySelector("#prev-day").addEventListener("click", () => shiftDay(-1));
document.querySelector("#next-day").addEventListener("click", () => shiftDay(1));
document.querySelector("#today").addEventListener("click", () => { state.activeDayId = dateKeyFromDate(new Date()); state.selectedId = null; state.activeKeywordId = null; state.expandedNoteId = null; day(); renderChrome(); renderCanvas(); persist({ type: "day.select", payload: { activeDayId: state.activeDayId, viewMode: state.viewMode, today: true } }); });
resetView.addEventListener("click", resetCamera);
boardShell.addEventListener("wheel", handleWheelZoom, { passive: false });
boardShell.addEventListener("pointerdown", beginPan);
window.addEventListener("dragenter", handleDragOver, true);
window.addEventListener("dragover", handleDragOver, true);
boardShell.addEventListener("dragover", handleDragOver);
boardShell.addEventListener("dragleave", handleDragLeave);
boardShell.addEventListener("drop", handleDrop);
document.addEventListener("paste", handlePaste);
trashButton?.addEventListener("dragover", (event) => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; trashButton.classList.add("trash-hot"); });
trashButton?.addEventListener("dragleave", () => clearTrashTarget());
trashButton?.addEventListener("drop", storeDropInTrash);
modeSelector.addEventListener("click", (event) => {
  const option = event.target.closest("[data-mode]");
  if (!option) return;
  event.stopPropagation();
  setViewMode(option.dataset.mode);
});
document.querySelectorAll(".action-bar .icon-button").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); openActionPopover(button); }));
canvas.addEventListener("pointerdown", (event) => {
  if (isOverviewMode()) return;
  state.selectedId = null; state.activeKeywordId = null; closePopovers(); renderCanvas();
});
document.addEventListener("keydown", handleGlobalKeydown);
document.addEventListener("click", (event) => { if (!event.target.closest(".popover,.action-bar,.view-mode-selector,.view-controls")) closePopovers(); });

initializeShellBridge().finally(() => {
  renderChrome();
  renderCanvas();
});
