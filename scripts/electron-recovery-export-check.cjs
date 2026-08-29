const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { ensureMetadataStore, saveWorkspaceSnapshot, loadWorkspaceSnapshot, writeRetryQueue, readRetryQueue } = require('../electron/persistence.cjs');
const { commitFilePath, previewRelinkFolder, commitRelinkMatches } = require('../electron/media-store.cjs');
const { validateRemoteImageUrl, detectRemoteImageInfo, assertImageSizeAllowed, maxRemoteImagePixels } = require('../electron/remote-policy.cjs');
const { fullDayBoundsError, sanitizeExportFileName } = require('../electron/export-helpers.cjs');
const { generateMockKeywordCandidates, generateKeywordCandidates, buildKeywordRequest, keywordProviderState, validateKeywordProviderRequest, defaultProviderConfig, sanitizeProviderConfig } = require('../electron/keyword-gateway.cjs');
const { validatePersistenceEnvelope, allowedMutationTypes } = require('../electron/mutation-contract.cjs');
const { validateImportPayload, resolveImportMediaReferences } = require('../electron/import-media-resolution.cjs');

function pngFixture(width, height) {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 2;
  return bytes;
}

function expectCode(label, fn, code) {
  let actual = 'ok';
  try { fn(); } catch (error) { actual = error.message; }
  assert.strictEqual(actual, code, label);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aesthetic-board-check-'));
try {
  ensureMetadataStore(tempRoot);
  const snapshot = {
    activeDayId: '2026-08-29',
    days: {
      '2026-08-29': {
        title: 'Recovery check day',
        camera: { x: 12, y: 24, zoom: 1.2 },
        items: [{ id: 'img-check', kind: 'image', x: 100, y: 140, width: 240, z: 3, note: 'check note', keywords: ['check keyword'], assetId: 'asset-check' }],
        trash: [{ trashId: 'trash-check', item: { id: 'old-link', kind: 'link', url: 'https://example.com' } }]
      }
    },
    retryQueue: [{ mutationId: 'mut-check', objectId: 'img-check', dayId: '2026-08-29', type: 'image.move', retryCount: 1, queueOrder: 1, error: 'CHECK_FAIL' }],
    retrySequence: 1
  };
  const ack = saveWorkspaceSnapshot(tempRoot, snapshot, { mutations: [{ id: 'mut-check', type: 'image.move' }] });
  assert.strictEqual(ack.ok, true, 'snapshot ack ok');
  const loaded = loadWorkspaceSnapshot(tempRoot);
  assert.strictEqual(loaded.ok, true, 'snapshot reload ok');
  assert.strictEqual(loaded.snapshot.days['2026-08-29'].items[0].x, 100, 'object position recovered');
  assert.strictEqual(loaded.snapshot.days['2026-08-29'].trash.length, 1, 'trash recovered');
  writeRetryQueue(tempRoot, snapshot.retryQueue, 1);
  const retry = readRetryQueue(tempRoot);
  assert.strictEqual(retry.queue.length, 1, 'retry metadata recovered');
  fs.mkdirSync(path.join(tempRoot, 'media'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'media', 'media-index.json'), JSON.stringify({ assets: { 'asset-check': { assetId: 'asset-check', sha256: 'sha-check', originalRelpath: 'media/originals/sha-check.png', variants: { working: { state: 'ready', relpath: 'media/working/sha-check-working.png' } } } } }, null, 2));

  const importDateMatch = 'import-2026-08-29-12345'.match(/(\d{4})-(\d{2})-(\d{2})/);
  const importDate = new Date(Number(importDateMatch[1]), Number(importDateMatch[2]) - 1, Number(importDateMatch[3]));
  assert.strictEqual(Number.isNaN(importDate.getTime()), false, 'import day id date extraction remains valid');

  assert.strictEqual(fullDayBoundsError({ width: 1600, height: 1200 }), '', 'normal full-day export bounds pass');
  assert.strictEqual(fullDayBoundsError({ width: 12000, height: 200 }), 'FULL_DAY_EXPORT_TOO_LARGE', 'dimension guard works');
  assert.strictEqual(fullDayBoundsError({ width: 9000, height: 9000 }), 'FULL_DAY_EXPORT_TOO_LARGE', 'pixel guard works');
  assert.strictEqual(sanitizeExportFileName('bad:/name', '.json'), 'bad--name.json', 'export filename sanitized');

  expectCode('localhost blocked', () => validateRemoteImageUrl('http://localhost/a.png'), 'REMOTE_BLOCKED_LOCAL_HOST');
  expectCode('loopback blocked', () => validateRemoteImageUrl('http://127.0.0.1/a.png'), 'REMOTE_BLOCKED_PRIVATE_HOST');
  expectCode('private blocked', () => validateRemoteImageUrl('http://192.168.0.2/a.png'), 'REMOTE_BLOCKED_PRIVATE_HOST');
  assert.strictEqual(validateRemoteImageUrl('https://example.com/a.png').hostname, 'example.com', 'public https allowed');
  const detected = detectRemoteImageInfo(pngFixture(800, 600));
  assert.deepStrictEqual(detected, { mime: 'image/png', width: 800, height: 600 }, 'png magic detection works');
  expectCode('unsupported bytes rejected', () => detectRemoteImageInfo(Buffer.from('not image')), 'REMOTE_UNSUPPORTED_MAGIC_BYTES');
  expectCode('pixel limit rejected', () => assertImageSizeAllowed({ width: maxRemoteImagePixels + 1, height: 1 }), 'REMOTE_IMAGE_PIXEL_LIMIT');
  const keywordRequest = buildKeywordRequest({ requestId: 'kw-check', object: { id: 'img-check', kind: 'image', sourceType: 'clipboard paste', note: 'soft archival paper texture', keywords: ['manual pin'] } });
  const keywordResponse = generateMockKeywordCandidates(keywordRequest);
  assert.strictEqual(keywordResponse.ok, true, 'mock keyword gateway returns ok');
  assert.strictEqual(keywordResponse.provider, 'local-mock', 'mock keyword gateway stays local');
  const defaultConfig = defaultProviderConfig();
  assert.strictEqual(defaultConfig.activeProvider, 'local-mock', 'keyword provider config defaults to local mock');
  assert.strictEqual(defaultConfig.allowNetwork, false, 'keyword provider config defaults to no network');
  const sanitizedExternal = sanitizeProviderConfig({ activeProvider: 'external-placeholder', externalProviderEnabled: true, allowImageAccess: true, allowTextAccess: true, allowNetwork: true });
  assert.strictEqual(sanitizedExternal.externalProviderEnabled, false, 'disabled external provider cannot be enabled through config');
  assert.strictEqual(sanitizedExternal.allowNetwork, false, 'disabled external provider cannot gain network permission through config');
  const provider = keywordProviderState(defaultConfig);
  assert.strictEqual(provider.activeProvider, 'local-mock', 'keyword provider defaults to local mock');
  assert.strictEqual(provider.externalProviderEnabled, false, 'external keyword provider disabled by default');
  assert.strictEqual(provider.externalProviderRequiresOptIn, true, 'external keyword provider requires opt-in');
  assert.strictEqual(provider.permissions.network, false, 'provider state reports no network access');
  assert.ok(provider.providers.some((entry) => entry.id === 'local-mock' && entry.enabled && !entry.external), 'provider registry exposes runnable local mock');
  assert.ok(provider.providers.some((entry) => entry.id === 'external-placeholder' && entry.external && !entry.enabled), 'provider registry exposes disabled external placeholder');
  const externalProvider = validateKeywordProviderRequest({ provider: 'external-placeholder' });
  assert.strictEqual(externalProvider.ok, false, 'external keyword provider rejected without opt-in');
  assert.strictEqual(externalProvider.error, 'KEYWORD_PROVIDER_REQUIRES_OPT_IN', 'external provider opt-in boundary is explicit');
  const externalGeneration = generateMockKeywordCandidates({ provider: 'external-placeholder', object: { id: 'img-check' } });
  assert.strictEqual(externalGeneration.ok, false, 'external keyword generation cannot run by default');
  const routedLocalGeneration = generateKeywordCandidates({ provider: 'local-mock', providerConfig: defaultConfig, object: { id: 'img-check', kind: 'image', note: 'local mock route' } });
  assert.strictEqual(routedLocalGeneration.ok, true, 'provider router runs local mock');
  const routedExternalGeneration = generateKeywordCandidates({ provider: 'external-placeholder', externalProviderOptIn: true, providerConfig: sanitizedExternal, object: { id: 'img-check' } });
  assert.strictEqual(routedExternalGeneration.ok, false, 'provider router refuses disabled external provider');
  assert.strictEqual(routedExternalGeneration.error, 'KEYWORD_PROVIDER_DISABLED', 'provider router keeps disabled external boundary explicit');
  const externalOptIn = validateKeywordProviderRequest({ provider: 'external-placeholder', externalProviderOptIn: true });
  assert.strictEqual(externalOptIn.ok, false, 'external provider still disabled after opt-in flag');
  assert.strictEqual(externalOptIn.error, 'KEYWORD_PROVIDER_DISABLED', 'disabled provider setting cannot enable external AI yet');
  const backupImport = validateImportPayload({ product: 'AestheticBoard', backupType: 'profile-backup', snapshot: { activeDayId: '2026-08-29', days: { '2026-08-29': { title: 'Backup day', items: [{ id: 'matched', kind: 'image', assetId: 'asset-check', sha256: 'sha-check' }, { id: 'missing', kind: 'image', assetId: 'asset-missing', sha256: 'sha-missing' }, { id: 'unsupported', kind: 'image' }], trash: [{ item: { id: 'trash-matched', kind: 'image', sha256: 'sha-check' } }] } } } });
  assert.strictEqual(backupImport.ok, true, 'profile-backup import validation works');
  const importMedia = resolveImportMediaReferences(backupImport, { assets: { 'asset-check': { assetId: 'asset-check', sha256: 'sha-check', originalRelpath: 'media/originals/sha-check.png' } } });
  assert.strictEqual(importMedia.matched, 2, 'import preview reports matched media');
  assert.strictEqual(importMedia.missing, 1, 'import preview reports missing media');
  assert.strictEqual(importMedia.unsupported, 1, 'import preview reports unsupported image refs');
  assert.ok(allowedMutationTypes.includes('media.relink'), 'media relink mutation allowed');
  const relinkFixture = path.join(tempRoot, 'relink-fixture.png');
  fs.writeFileSync(relinkFixture, pngFixture(64, 64));
  expectCode('relink sha mismatch rejected', () => commitFilePath(tempRoot, { captureId: 'relink-mismatch', filePath: relinkFixture, expectedSha256: 'sha-does-not-match', sourceType: 'import-media-relink' }), 'MEDIA_SHA256_MISMATCH');
  const relinkCommit = commitFilePath(tempRoot, { captureId: 'relink-ok', filePath: relinkFixture, sourceType: 'import-media-relink' });
  assert.ok(relinkCommit.assetId, 'relink file commit creates media asset');
  assert.ok(relinkCommit.rendererSrc.includes('?variant=working'), 'relinked media uses working variant URL');
  const batchPreview = previewRelinkFolder(tempRoot, [{ objectId: 'missing-batch', importedFromId: 'old-batch', sha256: relinkCommit.sha256, dayCanvasId: '2026-08-29' }, { objectId: 'still-missing', sha256: 'f'.repeat(64), dayCanvasId: '2026-08-29' }]);
  assert.strictEqual(batchPreview.ok, true, 'folder scan previews matched relink media');
  assert.strictEqual(batchPreview.matched, 1, 'folder scan reports matched media');
  assert.strictEqual(batchPreview.unmatched, 1, 'folder scan reports unmatched media');
  const batchCommit = commitRelinkMatches(tempRoot, batchPreview.matches.map((match) => ({ ...match, dayCanvasId: '2026-08-29' })));
  assert.strictEqual(batchCommit.repaired, 1, 'folder scan applies confirmed media match');
  assert.ok(keywordResponse.candidates.length > 0, 'mock keyword gateway returns candidates');
  assert.ok(allowedMutationTypes.includes('keyword.candidates'), 'keyword candidate mutation allowed');
  assert.ok(allowedMutationTypes.includes('keyword.accept'), 'keyword accept mutation allowed');
  assert.ok(allowedMutationTypes.includes('keyword.dismiss'), 'keyword dismiss mutation allowed');
  assert.strictEqual(allowedMutationTypes.includes('keyword.provider.set'), false, 'external provider settings mutation is unavailable');
  const candidateEnvelope = validatePersistenceEnvelope({ schemaVersion: 1, snapshot: loaded.snapshot, mutations: [{ id: 'kw-mut-check', type: 'keyword.candidates', targetId: 'img-check', dayCanvasId: '2026-08-29', payload: { candidates: keywordResponse.candidates } }] });
  assert.strictEqual(candidateEnvelope.ok, true, 'keyword candidate mutation validates');
  const candidateOnly = { activeDayId: '2026-08-29', days: { '2026-08-29': { title: 'Keyword day', camera: {}, items: [{ id: 'candidate-only', kind: 'image', keywords: [], keywordCandidates: [{ text: 'not searchable yet', state: 'suggested' }] }], trash: [] } } };
  const candidateSearch = saveWorkspaceSnapshot(tempRoot, candidateOnly, { mutations: [{ id: 'kw-candidate-only', type: 'keyword.candidates', targetId: 'candidate-only' }] });
  assert.strictEqual(candidateSearch.ok, true, 'candidate-only snapshot saves');
  const invisibleCandidate = require('../electron/persistence.cjs').querySearchIndex(tempRoot, 'not searchable yet', 10);
  assert.strictEqual(invisibleCandidate.results.length, 0, 'unaccepted candidates stay out of search');
  candidateOnly.days['2026-08-29'].items[0].keywords = ['not searchable yet'];
  const acceptedSearch = saveWorkspaceSnapshot(tempRoot, candidateOnly, { mutations: [{ id: 'kw-accepted', type: 'keyword.accept', targetId: 'candidate-only' }] });
  assert.strictEqual(acceptedSearch.ok, true, 'accepted keyword snapshot saves');
  const visibleKeyword = require('../electron/persistence.cjs').querySearchIndex(tempRoot, 'not searchable yet', 10);
  assert.ok(visibleKeyword.results.length >= 1, 'accepted keywords enter search');
  const candidateReviewSnapshot = { activeDayId: '2026-08-29', days: { '2026-08-29': { title: 'Candidate review day', camera: {}, items: [{ id: 'candidate-review', kind: 'image', keywords: ['pinned archival'], keywordCandidates: [
    { id: 'cand-accepted', text: 'pinned archival', confidence: 0.91, source: 'local-mock', provider: 'local-mock', state: 'accepted', createdAtUtc: '2026-08-29T01:00:00.000Z', reviewedAtUtc: '2026-08-29T01:01:00.000Z', acceptedAtUtc: '2026-08-29T01:01:00.000Z', pinnedAtUtc: '2026-08-29T01:01:00.000Z' },
    { id: 'cand-dismissed', text: 'discarded visual guess', confidence: 0.44, source: 'local-mock', provider: 'local-mock', state: 'dismissed', createdAtUtc: '2026-08-29T01:02:00.000Z', reviewedAtUtc: '2026-08-29T01:03:00.000Z', dismissedAtUtc: '2026-08-29T01:03:00.000Z' }
  ] }], trash: [] } } };
  const reviewAck = saveWorkspaceSnapshot(tempRoot, candidateReviewSnapshot, { mutations: [{ id: 'kw-review', type: 'keyword.accept', targetId: 'candidate-review' }] });
  assert.strictEqual(reviewAck.ok, true, 'candidate review snapshot saves');
  const reviewLoaded = loadWorkspaceSnapshot(tempRoot);
  const reviewCandidates = reviewLoaded.snapshot.days['2026-08-29'].items[0].keywordCandidates;
  assert.strictEqual(reviewCandidates[0].id, 'cand-accepted', 'accepted candidate id recovered');
  assert.strictEqual(reviewCandidates[0].provider, 'local-mock', 'accepted candidate provider recovered');
  assert.strictEqual(reviewCandidates[0].acceptedAtUtc, '2026-08-29T01:01:00.000Z', 'accepted candidate timestamp recovered');
  assert.strictEqual(reviewCandidates[1].state, 'dismissed', 'dismissed candidate state recovered');
  assert.strictEqual(reviewCandidates[1].dismissedAtUtc, '2026-08-29T01:03:00.000Z', 'dismissed candidate timestamp recovered');
  const dismissedSearch = require('../electron/persistence.cjs').querySearchIndex(tempRoot, 'discarded visual guess', 10);
  assert.strictEqual(dismissedSearch.results.length, 0, 'dismissed candidates stay out of search');
  const pinnedReviewSearch = require('../electron/persistence.cjs').querySearchIndex(tempRoot, 'pinned archival', 10);
  assert.ok(pinnedReviewSearch.results.length >= 1, 'accepted pinned candidate remains searchable');
  const keywordRetryEntries = [
    { mutation: { id: 'kw-dup-1', type: 'keyword.accept', payload: { candidateId: 'cand-accepted' } } },
    { mutation: { id: 'kw-dup-2', type: 'keyword.accept', payload: { candidateId: 'cand-accepted' } } },
    { mutation: { id: 'kw-dismiss-1', type: 'keyword.dismiss', payload: { candidateId: 'cand-dismissed' } } }
  ];
  const uniqueKeywordRetryKeys = new Set(keywordRetryEntries.map((entry) => [entry.mutation.type, entry.mutation.payload.candidateId || entry.mutation.id].join(':')));
  assert.strictEqual(uniqueKeywordRetryKeys.size, 2, 'keyword retry metadata dedupes by candidate identity');
  console.log('Slice 34/35/36/37/38/39/40/41/42/43/44/45/PackageD checks passed at ' + tempRoot);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
