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
let profileState = { ready: false, profileLabel: "Browser preview", directories: [] };

const state = loadState();
let dragIntent = null;
let saveTimer = 0;
let latestPersistenceRequest = 0;
let lastAckRevision = Number(state.persistenceRevision || 0);

function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function padDatePart(value) { return String(value).padStart(2, "0"); }
function dateKeyFromDate(date) {
  const localDate = startOfDay(date);
  return `${localDate.getFullYear()}-${padDatePart(localDate.getMonth() + 1)}-${padDatePart(localDate.getDate())}`;
}
function activeDate() {
  const [year, month, date] = state.activeDayId.split("-").map(Number);
  return new Date(year, month - 1, date);
}
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function cloneItems(items) { return items.map((item) => ({ ...item, keywords: [...(item.keywords || [])] })); }

function createDay(seedItems = []) {
  return { title: "", camera: { ...DEFAULT_CAMERA }, pasteSequence: 0, items: cloneItems(seedItems), trash: [] };
}

function loadState() {
  const todayId = dateKeyFromDate(new Date());
  const fallback = { activeDayId: todayId, surface: "quiet", days: { [todayId]: createDay(initialItems) }, selectedId: "img-01", activeKeywordId: null, expandedNoteId: null, dragHarness: [] };
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
    day.trash = Array.isArray(day.trash) ? day.trash : [];
  });
  value.selectedId ??= null;
  value.activeKeywordId ??= null;
  value.expandedNoteId ??= null;
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
    lifecycleState: item.lifecycleState || "READY",
    assetId: item.assetId || "",
    url: item.url || "",
    src: item.src || ""
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
      item = { ...job.imageObject, id: job.imageObject.id || job.id, captureJobId: job.id, kind: job.imageObject.kind || "image", src: job.rendererSrc || job.imageObject.src || "", keywords: [...(job.imageObject.keywords || ["recovered capture"])] };
      if (!board.items.some((candidate) => candidate.id === item.id || candidate.captureJobId === job.id)) board.items.push(item);
    }
    if (!item) return;
    item.captureJobId = job.id;
    if (job.state === "DURABLE") {
      item.lifecycleState = "DURABLE";
      item.assetId = job.assetId || item.assetId;
      item.sha256 = job.sha256 || item.sha256;
      item.originalRelpath = job.originalRelpath || item.originalRelpath;
      item.src = job.rendererSrc || item.src;
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
  }
  return null;
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
    (board.items || []).forEach((item) => {
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
      settleMutations(request.mutations.map((mutation) => mutation.id));
      if (requestId === latestPersistenceRequest) saveState.textContent = "Saved";
      renderCanvas();
      return;
    }
    try {
      const ack = await shellBridge.saveWorkspaceMutations({ schemaVersion: 1, clientId: "renderer", baseRevision: lastAckRevision, mutations: request.mutations, snapshot });
      if (!ack?.ok) throw new Error(ack?.details || ack?.error || "Save failed");
      lastAckRevision = Number(ack.revision || lastAckRevision);
      state.persistenceRevision = lastAckRevision;
      settleMutations(ack.mutationIds || request.mutations.map((mutation) => mutation.id));
      saveState.title = "";
      if (requestId === latestPersistenceRequest) saveState.textContent = "Saved";
      renderCanvas();
    } catch (error) {
      const ids = request.mutations.map((mutation) => mutation.id);
      settleMutations(ids, error?.message || "Persistence ACK failed");
      if (requestId === latestPersistenceRequest) {
        saveState.textContent = "Needs retry";
        saveState.title = error?.message || "Persistence ACK failed";
      }
      renderCanvas();
    }
  }, delay);
}

function formatMainDate(date) { return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", weekday: "long" }).format(date); }
function formatSecondaryDate(date) { return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" }).format(date); }
function screenToWorld(clientX, clientY) { const cam = camera(); return { x: (clientX - cam.x) / cam.zoom, y: (clientY - cam.y) / cam.zoom }; }


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
      saveState.textContent = "Recovered";
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
  if (handler) button.addEventListener("click", handler);
  return button;
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

function openMorePopover(popover) {
  popover.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "More";
  const status = shellBridge ? (shellState.alwaysOnTop ? "On" : "Off") : "Electron only";
  const always = makePopoverButton("Always-on-top", status, toggleAlwaysOnTop, !shellBridge);
  always.dataset.action = "always-on-top";
  const profileDetail = profileState.metadata?.ready ? "SQLite ready" : profileState.ready ? "Files ready" : "Browser only";
  const profile = makePopoverButton("Local profile", profileDetail, null, true);
  profile.className = "profile-status-row";
  profile.title = profileState.profileLabel || "Profile unavailable";
  const dragHarness = makePopoverButton("Drag Harness", `${state.dragHarness.length} samples`, () => openDragHarnessPopover(popover));
  const keyword = makePopoverButton("Keyword visibility", "Soon", null, true);
  const privacy = makePopoverButton("Data and privacy", profileState.profileLabel || "Local only", null, true);
  popover.append(title, always, profile, dragHarness, keyword, privacy);
}
function renderChrome() {
  const currentDay = day();
  const date = activeDate();
  titleButton.textContent = currentDay.title || formatMainDate(date);
  dateLabel.textContent = currentDay.title ? formatSecondaryDate(date) : "Day Canvas";
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
  const cam = camera();
  canvas.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`;
  zoomPercent.textContent = `${Math.round(cam.zoom * 100)}%`;
  updateBoardDensityState();
}

function renderCanvas() {
  canvas.innerHTML = "";
  items().slice().sort((a, b) => a.z - b.z).forEach((item) => canvas.appendChild(createBoardObject(item)));
  renderCamera();
}

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
  object.classList.toggle("capture-failed", item.lifecycleState === "FAILED");
  object.classList.toggle("capture-durable", item.lifecycleState === "DURABLE" || item.lifecycleState === "ORIGINAL_LOCAL");
  object.classList.toggle("mutation-pending", Boolean(item.pendingMutationIds?.length));
  object.classList.toggle("mutation-failed", Boolean(item.mutationError));
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

  const img = document.createElement("img");
  img.src = item.src;
  img.alt = item.keywords[0] || "Captured image";
  img.draggable = false;
  img.addEventListener("load", () => { item.aspect = img.naturalHeight / img.naturalWidth; }, { once: true });

  const lockMark = document.createElement("span");
  lockMark.className = "lock-mark";
  lockMark.textContent = "Locked";
  const captureMark = document.createElement("span");
  captureMark.className = "capture-state-mark";
  captureMark.textContent = item.mutationError ? "Retry needed" : captureStateLabel(item);
  captureMark.title = item.mutationError || item.captureError || "";
  frame.append(createKeywordLayer(item), img, lockMark, captureMark);
  if (item.lifecycleState === "FAILED") frame.appendChild(createCaptureActions(item));

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

function createKeywordLayer(item) {
  const layer = document.createElement("div");
  layer.className = "keyword-layer";
  const keywords = item.keywords?.length ? item.keywords : [item.kind === "link" ? "link capture" : "image first"];
  const folded = document.createElement("button");
  folded.className = "keyword-folded";
  folded.type = "button";
  folded.textContent = `${keywords[0]} +${Math.max(keywords.length - 1, 0)}`;
  folded.title = "Expand keywords";
  folded.addEventListener("pointerdown", (event) => event.stopPropagation());
  folded.addEventListener("click", (event) => { event.stopPropagation(); state.activeKeywordId = state.activeKeywordId === item.id ? null : item.id; renderCanvas(); });
  const expanded = document.createElement("div");
  expanded.className = "keyword-expanded";
  keywords.forEach((keyword, index) => {
    const row = document.createElement("div");
    row.className = `keyword-chip${index === 0 ? " pinned" : ""}`;
    const text = document.createElement("span");
    text.className = "keyword-text";
    text.textContent = keyword;
    text.title = "Copy keyword, double click to pin";
    text.addEventListener("pointerdown", (event) => event.stopPropagation());
    text.addEventListener("click", () => copyKeyword(keyword, expanded));
    text.addEventListener("dblclick", () => pinKeyword(item, keyword));
    const button = document.createElement("button");
    button.type = "button";
    button.ariaLabel = `Copy ${keyword}`;
    button.innerHTML = `<img src="${copyIcon}" alt="">`;
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", () => copyKeyword(keyword, expanded));
    row.append(text, button);
    expanded.appendChild(row);
  });
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
function pinKeyword(item, keyword) { item.keywords = [keyword, ...item.keywords.filter((value) => value !== keyword)]; state.activeKeywordId = item.id; renderCanvas(); persist({ type: "keyword.pin", targetId: item.id, payload: { keyword, keywords: [...item.keywords] } }); }

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
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("pointerdown", (event) => event.stopPropagation());
  remove.addEventListener("click", (event) => {
    event.stopPropagation();
    moveImageToTrash(item.id);
  });
  actions.append(retry, remove);
  return actions;
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
    item.lifecycleState = "REMOTE_REFERENCE";
    persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, src: item.src, retry: true } });
    renderCanvas();
    return;
  }
  item.captureError = "No retry source available";
  persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, error: item.captureError, retry: true } });
  renderCanvas();
}

function captureStateLabel(item) {
  if (item.lifecycleState === "RESOLVING") return "Resolving";
  if (item.lifecycleState === "LOCALIZING") return "Localizing";
  if (item.lifecycleState === "FAILED") return "Failed";
  if (item.lifecycleState === "DURABLE") return "Durable";
  if (item.lifecycleState === "ORIGINAL_LOCAL") return "Local";
  return "";
}

function beginPan(event) {
  if (event.button !== 1) return;
  if (event.target.closest(".title-area,.action-bar,.temporal-controls,.popover,.view-controls,.keyword-layer,.quick-note,.resize-handle")) return;
  event.preventDefault(); event.stopPropagation(); closePopovers(); boardShell.classList.add("panning");
  const cam = camera();
  dragIntent = { type: "pan", origin: { pointerX: event.clientX, pointerY: event.clientY, cameraX: cam.x, cameraY: cam.y } };
  boardShell.setPointerCapture(event.pointerId);
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
  if (event.target.closest(".title-area,.action-bar,.temporal-controls,.popover,.view-controls")) return;
  event.preventDefault(); closePopovers();
  const before = screenToWorld(event.clientX, event.clientY);
  const cam = camera();
  const nextZoom = clamp(cam.zoom * Math.exp(-event.deltaY * 0.001), MIN_ZOOM, MAX_ZOOM);
  cam.x = Math.round(event.clientX - before.x * nextZoom);
  cam.y = Math.round(event.clientY - before.y * nextZoom);
  cam.zoom = Number(nextZoom.toFixed(3));
  renderCamera(); persist({ type: "camera.update", payload: { camera: { ...camera() }, source: "wheel" } });
}
function resetCamera() { day().camera = { ...DEFAULT_CAMERA }; renderCamera(); persist({ type: "camera.reset", payload: { camera: { ...day().camera } } }); }

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
    keywords: sourceType === "browser-drag" ? ["browser drag", "image first", "drop position", "visual capture", "quiet archive"] : ["clipboard paste", "image first", "unsorted reference", "visual capture", "quiet archive"],
    note: "",
    lifecycleState: options.lifecycleState || "READY",
    captureError: "",
    captureJobId: options.captureJobId || id,
    pendingDataUrl: String(src || "").startsWith("data:image/") ? src : ""
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
    note: ""
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
    item.src = response.rendererSrc || item.src;
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
  const item = createCapturedImage(url, { width: 280, height: 210 }, "browser-drag", worldPoint, { lifecycleState: "RESOLVING" });
  try {
    const naturalSize = await imageSizeFromSource(url);
    item.width = comfortableInitialWidth(naturalSize.width, naturalSize.height);
    item.lifecycleState = "REMOTE_REFERENCE";
    item.captureError = "";
  } catch (error) {
    item.lifecycleState = "FAILED";
    item.captureError = error?.message || "Remote resolve failed";
  }
  renderCanvas();
  persist({ type: "capture.lifecycle", targetId: item.id, payload: { state: item.lifecycleState, error: item.captureError || "", src: item.src } });
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
  state.activeDayId = dateKeyFromDate(new Date(activeDate().getTime() + days * ONE_DAY));
  state.selectedId = null; state.activeKeywordId = null; state.expandedNoteId = null;
  day(); renderChrome(); renderCanvas(); persist({ type: "day.select", payload: { activeDayId: state.activeDayId } });
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
    empty.textContent = "Trash is empty.";
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
    if (entry.kind === "image" || entry.kind === "external-image") {
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
function openActionPopover(trigger) {
  const type = trigger.dataset.popover;
  const rect = trigger.getBoundingClientRect();
  popoverLayer.innerHTML = "";
  const popover = document.createElement("div");
  popover.className = "popover";
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
  if (type === "export") popover.innerHTML = `<h2>Download / Share</h2><button type="button" disabled>Download current page</button><button type="button" disabled>Share current page</button>`;
  if (type === "trash") openTrashPopover(popover);
  popoverLayer.appendChild(popover);
}
function closePopovers() { popoverLayer.innerHTML = ""; }

titleButton.addEventListener("click", () => { titleArea.classList.add("editing"); titleEditor.value = day().title; titleEditor.placeholder = formatMainDate(activeDate()); titleEditor.style.width = `${Math.max(240, titleButton.offsetWidth + 24)}px`; titleEditor.focus(); });
titleEditor.addEventListener("blur", () => { day().title = titleEditor.value.trim(); titleArea.classList.remove("editing"); renderChrome(); persist({ type: "day.title", payload: { title: day().title } }); });
titleEditor.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === "Escape") titleEditor.blur(); });
document.querySelector("#prev-day").addEventListener("click", () => shiftDay(-1));
document.querySelector("#next-day").addEventListener("click", () => shiftDay(1));
document.querySelector("#today").addEventListener("click", () => { state.activeDayId = dateKeyFromDate(new Date()); state.selectedId = null; state.activeKeywordId = null; state.expandedNoteId = null; day(); renderChrome(); renderCanvas(); persist({ type: "day.select", payload: { activeDayId: state.activeDayId, today: true } }); });
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
modeSelector.addEventListener("click", (event) => { event.stopPropagation(); const rect = modeSelector.getBoundingClientRect(); popoverLayer.innerHTML = ""; const popover = document.createElement("div"); popover.className = "popover"; popover.style.left = `${rect.left}px`; popover.style.top = `${rect.bottom + 8}px`; popover.innerHTML = `<h2>View Mode</h2><button type="button">Day Mode</button><button type="button" disabled>Weekly</button><button type="button" disabled>Monthly</button>`; popoverLayer.appendChild(popover); });
document.querySelectorAll(".action-bar .icon-button").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); openActionPopover(button); }));
canvas.addEventListener("pointerdown", () => { state.selectedId = null; state.activeKeywordId = null; closePopovers(); renderCanvas(); });
document.addEventListener("keydown", handleGlobalKeydown);
document.addEventListener("click", (event) => { if (!event.target.closest(".popover,.action-bar,.mode-selector,.view-controls")) closePopovers(); });

initializeShellBridge().finally(() => {
  renderChrome();
  renderCanvas();
});
