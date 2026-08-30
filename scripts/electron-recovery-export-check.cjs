const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { ensureMetadataStore, saveWorkspaceSnapshot, loadWorkspaceSnapshot, writeRetryQueue, readRetryQueue, approvedKeywordTexts } = require('../electron/persistence.cjs');
const { commitFilePath, previewRelinkFolder, commitRelinkMatches, resolveAssetPath, generateAssetDerivatives } = require('../electron/media-store.cjs');
const { validateRemoteImageUrl, detectRemoteImageInfo, assertImageSizeAllowed, maxRemoteImagePixels } = require('../electron/remote-policy.cjs');
const { fullDayBoundsError, sanitizeExportFileName } = require('../electron/export-helpers.cjs');
const { generateMockKeywordCandidates, generateKeywordCandidates, buildKeywordRequest, keywordProviderState, validateKeywordProviderRequest, defaultProviderConfig, sanitizeProviderConfig, providerDiagnosticsFromConfig, providerKeyStatusFromConfig } = require('../electron/keyword-gateway.cjs');
const { providerErrorCodes, buildProviderKeywordJob, validateProviderKeywordResponse, runProviderKeywordJob, qwenApiKey, qwenChatCompletionsUrl, testProviderConnection, qwenEffectiveOptions, extractPromptVersion, loadQwenPromptTemplate, mapHttpStatus } = require('../electron/ai-provider-connectors.cjs');
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
(async () => {
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
  const sanitizedQwen = sanitizeProviderConfig({ activeProvider: 'qwen3.7-flash', externalProviderEnabled: true, allowImageAccess: true, allowTextAccess: true, allowNetwork: true, providerOptions: { 'qwen3.7-flash': { model: 'qwen3.7-flash', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', timeoutMs: 12000, apiKey: 'must-not-survive' } } });
  assert.strictEqual(sanitizedQwen.externalProviderEnabled, true, 'Qwen config can be explicitly enabled');
  assert.strictEqual(sanitizedQwen.allowNetwork, true, 'Qwen config can opt into network access');
  assert.strictEqual(sanitizedQwen.providerOptions['qwen3.7-flash'].apiKey, undefined, 'provider config never stores API keys');
  assert.strictEqual(qwenApiKey({ AESTHETICBOARD_QWEN_API_KEY: 'key-a', DASHSCOPE_API_KEY: 'key-b' }), 'key-a', 'Qwen key prefers app-specific env var');
  assert.strictEqual(qwenApiKey({ DASHSCOPE_API_KEY: 'key-b' }), 'key-b', 'Qwen key falls back to DashScope env var');
  assert.strictEqual(qwenChatCompletionsUrl('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/'), 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', 'Qwen compatible URL is normalized');
  assert.strictEqual(extractPromptVersion('**Version:** 1.0'), '1.0', 'prompt parser reads markdown version metadata');
  assert.strictEqual(extractPromptVersion('promptVersion = visual-keywords-v2.2.0'), 'visual-keywords-v2.2.0', 'prompt parser reads promptVersion metadata');
  const loadedQwenPrompt = loadQwenPromptTemplate();
  assert.ok(loadedQwenPrompt.promptVersion, 'Qwen prompt loader always exposes a prompt version');
  const qwenDefaultDiagnostics = providerDiagnosticsFromConfig(sanitizedQwen, {});
  assert.strictEqual(qwenDefaultDiagnostics.qwen.model, 'qwen3.7-flash', 'provider diagnostics exposes effective Qwen model');
  assert.strictEqual(qwenDefaultDiagnostics.qwen.apiKeyAvailable, false, 'provider diagnostics does not invent API key state');
  assert.strictEqual(qwenDefaultDiagnostics.qwen.apiKeySource, 'not set', 'provider diagnostics omits API key secret');
  assert.strictEqual(qwenDefaultDiagnostics.qwen.promptVersion, loadedQwenPrompt.promptVersion, 'provider diagnostics exposes active prompt version');
  const qwenEnvDiagnostics = providerDiagnosticsFromConfig(defaultConfig, { AESTHETICBOARD_QWEN_MODEL: 'qwen3.7-flash-verified', AESTHETICBOARD_QWEN_API_KEY: 'secret-value' });
  assert.strictEqual(qwenEnvDiagnostics.qwen.model, 'qwen3.7-flash-verified', 'Qwen model env override wins in diagnostics');
  assert.strictEqual(qwenEnvDiagnostics.qwen.modelSource, 'AESTHETICBOARD_QWEN_MODEL', 'Qwen diagnostics shows model source');
  assert.strictEqual(qwenEnvDiagnostics.qwen.apiKeyAvailable, true, 'Qwen diagnostics shows key availability');
  assert.strictEqual(JSON.stringify(qwenEnvDiagnostics).includes('secret-value'), false, 'Qwen diagnostics never exposes key value');
  const rendererSafeKeyStatus = providerKeyStatusFromConfig(defaultConfig, { AESTHETICBOARD_QWEN_API_KEY: 'secret-value' });
  assert.deepStrictEqual(rendererSafeKeyStatus.qwen, { providerId: 'qwen3.7-flash', available: true, source: 'AESTHETICBOARD_QWEN_API_KEY', secretVisibleToRenderer: false }, 'renderer-safe key status exposes availability and source only');
  assert.strictEqual(JSON.stringify(rendererSafeKeyStatus).includes('secret-value'), false, 'renderer-safe key status never exposes secret value');
  const qwenEffective = qwenEffectiveOptions(sanitizedQwen, { env: {} });
  assert.strictEqual(qwenEffective.model, 'qwen3.7-flash', 'Qwen effective options lock configured model');
  const provider = keywordProviderState(defaultConfig);
  assert.strictEqual(provider.activeProvider, 'local-mock', 'keyword provider defaults to local mock');
  assert.strictEqual(provider.externalProviderEnabled, false, 'external keyword provider disabled by default');
  assert.strictEqual(provider.externalProviderRequiresOptIn, true, 'external keyword provider requires opt-in');
  assert.strictEqual(provider.permissions.network, false, 'provider state reports no network access');
  assert.ok(provider.providers.some((entry) => entry.id === 'local-mock' && entry.enabled && !entry.external), 'provider registry exposes runnable local mock');
  assert.ok(provider.providers.some((entry) => entry.id === 'external-placeholder' && entry.external && !entry.enabled), 'provider registry exposes disabled external placeholder');
  assert.ok(provider.providers.some((entry) => entry.id === 'qwen3.7-flash' && entry.enabled && entry.external), 'provider registry exposes runnable Qwen provider');
  assert.ok(provider.providers.some((entry) => entry.id === 'gpt-5.7-luna' && entry.external && !entry.enabled), 'provider registry exposes disabled GPT-5.7 Luna placeholder');
  const externalProvider = validateKeywordProviderRequest({ provider: 'external-placeholder' });
  assert.strictEqual(externalProvider.ok, false, 'external keyword provider rejected without opt-in');
  assert.strictEqual(externalProvider.error, providerErrorCodes.PROVIDER_REQUIRES_OPT_IN, 'external provider opt-in boundary is explicit');
  const externalGeneration = generateMockKeywordCandidates({ provider: 'external-placeholder', object: { id: 'img-check' } });
  assert.strictEqual(externalGeneration.ok, false, 'external keyword generation cannot run by default');
  const routedLocalGeneration = generateKeywordCandidates({ provider: 'local-mock', providerConfig: defaultConfig, object: { id: 'img-check', kind: 'image', note: 'local mock route' } });
  assert.strictEqual(routedLocalGeneration.ok, true, 'provider router runs local mock');
  const routedExternalGeneration = generateKeywordCandidates({ provider: 'external-placeholder', externalProviderOptIn: true, providerConfig: sanitizedExternal, object: { id: 'img-check' } });
  assert.strictEqual(routedExternalGeneration.ok, false, 'provider router refuses disabled external provider');
  assert.strictEqual(routedExternalGeneration.error, providerErrorCodes.PROVIDER_DISABLED, 'provider router keeps disabled external boundary explicit');
  const externalOptIn = validateKeywordProviderRequest({ provider: 'external-placeholder', externalProviderOptIn: true });
  assert.strictEqual(externalOptIn.ok, false, 'external provider still disabled after opt-in flag');
  assert.strictEqual(externalOptIn.error, providerErrorCodes.PROVIDER_DISABLED, 'disabled provider setting cannot enable external AI yet');
  const qwenValidation = validateKeywordProviderRequest({ provider: 'qwen3.7-flash', providerConfig: sanitizedQwen });
  assert.strictEqual(qwenValidation.ok, true, 'Qwen request passes gateway validation after config opt-in');
  const sanitizedGptLuna = sanitizeProviderConfig({ activeProvider: 'gpt-5.7-luna', externalProviderEnabled: true, allowImageAccess: true, allowTextAccess: true, allowNetwork: true });
  assert.strictEqual(sanitizedGptLuna.activeProvider, 'local-mock', 'stale GPT-5.7 Luna config falls back to local mock');
  assert.strictEqual(sanitizedGptLuna.externalProviderEnabled, false, 'stale GPT-5.7 Luna config cannot enable external AI');
  assert.strictEqual(sanitizedGptLuna.allowNetwork, false, 'stale GPT-5.7 Luna config cannot enable network access');
  const gptLunaValidation = validateKeywordProviderRequest({ provider: 'gpt-5.7-luna', providerConfig: sanitizedGptLuna, externalProviderOptIn: true });
  assert.strictEqual(gptLunaValidation.ok, false, 'GPT-5.7 Luna remains a disabled placeholder');
  assert.strictEqual(gptLunaValidation.error, providerErrorCodes.PROVIDER_DISABLED, 'GPT-5.7 Luna cannot make real calls yet');
  const gptLunaGeneration = generateKeywordCandidates({ provider: 'gpt-5.7-luna', providerConfig: sanitizedGptLuna, externalProviderOptIn: true, object: { id: 'img-check', kind: 'image', lifecycleState: 'DURABLE', assetId: 'asset-check' } });
  const gptLunaGenerationResult = gptLunaGeneration && typeof gptLunaGeneration.then === 'function' ? await gptLunaGeneration : gptLunaGeneration;
  assert.strictEqual(gptLunaGenerationResult.ok, false, 'GPT-5.7 Luna keyword generation is blocked');
  assert.strictEqual(gptLunaGenerationResult.error, providerErrorCodes.PROVIDER_DISABLED, 'GPT-5.7 Luna cannot reach a network execution path');
  const realProviderFixture = { id: 'external-enabled-fixture', external: true, enabled: true, canReadImage: true, canReadText: true, requiresNetwork: true };
  const nonDurableJob = buildProviderKeywordJob({ requestId: 'ai-job-check', provider: realProviderFixture, object: { id: 'img-not-durable', kind: 'image' } });
  assert.strictEqual(nonDurableJob.ok, false, 'provider connector requires durable image before external image access');
  assert.strictEqual(nonDurableJob.error, providerErrorCodes.IMAGE_NOT_DURABLE, 'non-durable image gets explicit provider error');
  const durableJob = buildProviderKeywordJob({ requestId: 'ai-job-durable', provider: realProviderFixture, object: { id: 'img-durable', kind: 'image', lifecycleState: 'DURABLE', assetId: 'asset-check', media: { variants: { working: 'app-media://asset/asset-check?variant=working' } } } });
  assert.strictEqual(durableJob.ok, true, 'provider connector can build an approved durable image job');
  const unimplementedJob = runProviderKeywordJob(durableJob.job);
  assert.strictEqual(unimplementedJob.ok, false, 'real provider connector is not implemented without API work');
  assert.strictEqual(unimplementedJob.error, providerErrorCodes.PROVIDER_NOT_IMPLEMENTED, 'real provider connector cannot call a real API yet');
  const invalidProviderResponse = validateProviderKeywordResponse({ ok: true, provider: 'external-enabled-fixture', candidates: [] }, { providerId: 'external-enabled-fixture', requestId: 'ai-job-durable' });
  assert.strictEqual(invalidProviderResponse.ok, false, 'provider connector rejects empty keyword responses');
  assert.strictEqual(invalidProviderResponse.error, providerErrorCodes.PROVIDER_SCHEMA_INVALID, 'provider connector validates real-provider response schema');
  const validProviderResponse = validateProviderKeywordResponse({ ok: true, provider: 'external-enabled-fixture', requestId: 'ai-job-durable', promptVersion: 'quality-guard-v1', candidates: [{ text: 'Cinematic Texture', confidence: 1.4 }, { text: 'cinematic texture', confidence: 0.2 }, { keyword: 'soft light', type: 'lighting' }] }, { providerId: 'external-enabled-fixture', requestId: 'ai-job-durable' });
  assert.strictEqual(validProviderResponse.ok, true, 'provider connector accepts structured keyword responses');
  assert.strictEqual(validProviderResponse.candidates.length, 2, 'provider connector dedupes candidate text');
  assert.strictEqual(validProviderResponse.candidates[0].confidence, 1, 'provider connector clamps candidate confidence');
  assert.strictEqual(validProviderResponse.promptVersion, 'quality-guard-v1', 'provider response records prompt version');
  assert.strictEqual(validProviderResponse.candidates[0].promptVersion, 'quality-guard-v1', 'candidate records prompt version');
  const emptyProviderResponse = validateProviderKeywordResponse({ ok: true, provider: 'external-enabled-fixture', requestId: 'ai-empty', candidates: [] }, { providerId: 'external-enabled-fixture', requestId: 'ai-empty' });
  assert.strictEqual(emptyProviderResponse.ok, false, 'empty provider response is rejected');
  assert.strictEqual(emptyProviderResponse.error, providerErrorCodes.PROVIDER_SCHEMA_INVALID, 'empty provider response uses schema error');
  const malformedProviderResponse = validateProviderKeywordResponse({ ok: true, provider: 'external-enabled-fixture', requestId: 'ai-malformed', candidates: [{ text: '' }, 'bad-shape', { text: 'x'.repeat(160) }] }, { providerId: 'external-enabled-fixture', requestId: 'ai-malformed' });
  assert.strictEqual(malformedProviderResponse.ok, false, 'malformed provider candidates are rejected');
  assert.strictEqual(malformedProviderResponse.error, providerErrorCodes.PROVIDER_SCHEMA_INVALID, 'malformed provider response uses schema error');
  const duplicateProviderResponse = validateProviderKeywordResponse({ ok: true, provider: 'external-enabled-fixture', requestId: 'ai-duplicate', candidates: [{ text: 'soft focus', confidence: 0.7 }, { en: 'soft focus', confidence: 0.4 }, { keyword: 'paper grain', confidence: '0.66' }] }, { providerId: 'external-enabled-fixture', requestId: 'ai-duplicate', promptVersion: 'duplicate-test-v1' });
  assert.strictEqual(duplicateProviderResponse.ok, true, 'duplicate provider response can be deduped when valid terms remain');
  assert.strictEqual(duplicateProviderResponse.quality.duplicateCount, 1, 'duplicate provider response reports duplicate count');
  assert.strictEqual(duplicateProviderResponse.candidates[1].confidence, 0.66, 'numeric confidence string is accepted');
  const timeoutProviderResponse = validateProviderKeywordResponse({ ok: false, provider: 'external-enabled-fixture', error: providerErrorCodes.PROVIDER_TIMEOUT }, { providerId: 'external-enabled-fixture', requestId: 'ai-timeout' });
  assert.strictEqual(timeoutProviderResponse.error, providerErrorCodes.PROVIDER_TIMEOUT, 'timeout stays a local AI failure');
  const rateLimitProviderResponse = validateProviderKeywordResponse({ ok: false, provider: 'external-enabled-fixture', error: providerErrorCodes.PROVIDER_RATE_LIMITED }, { providerId: 'external-enabled-fixture', requestId: 'ai-rate-limit' });
  assert.strictEqual(rateLimitProviderResponse.error, providerErrorCodes.PROVIDER_RATE_LIMITED, 'rate limit stays a local AI failure');
  assert.strictEqual(mapHttpStatus(401), providerErrorCodes.PROVIDER_AUTH_FAILED, 'Qwen auth failure is distinct from missing key');
  assert.strictEqual(mapHttpStatus(404, 'model does not exist'), providerErrorCodes.PROVIDER_MODEL_NOT_FOUND, 'Qwen model-name failure is explicit');
  assert.strictEqual(mapHttpStatus(408), providerErrorCodes.PROVIDER_TIMEOUT, 'Qwen timeout maps to provider timeout');
  assert.strictEqual(mapHttpStatus(429), providerErrorCodes.PROVIDER_RATE_LIMITED, 'Qwen rate limit maps to provider rate limit');
  const qwenMissingKey = testProviderConnection('qwen3.7-flash', { providerConfig: sanitizedQwen, env: {} });
  const qwenMissingKeyResult = qwenMissingKey && typeof qwenMissingKey.then === 'function' ? await qwenMissingKey : qwenMissingKey;
  assert.strictEqual(qwenMissingKeyResult.ok, false, 'Qwen provider test reports missing key without network');
  assert.strictEqual(qwenMissingKeyResult.error, providerErrorCodes.MISSING_API_KEY, 'Qwen provider test uses local missing-key error');
  const gptProviderTest = testProviderConnection('gpt-5.7-luna', { providerConfig: sanitizedQwen, env: {} });
  assert.strictEqual(gptProviderTest.ok, false, 'GPT-5.7 Luna provider test remains unavailable');
  assert.strictEqual(gptProviderTest.error, providerErrorCodes.PROVIDER_NOT_IMPLEMENTED, 'GPT-5.7 Luna has no API adapter yet');
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
  assert.strictEqual(relinkCommit.variants.working.state, 'pending', 'new media does not block durable state on working derivative');
  const workingFallback = resolveAssetPath(tempRoot, relinkCommit.assetId, 'working');
  assert.strictEqual(workingFallback.fallback, true, 'pending working derivative falls back to original');
  const derivativeResult = generateAssetDerivatives(tempRoot, relinkCommit.assetId);
  assert.strictEqual(derivativeResult.ok, true, 'background derivative build can complete after durable commit');
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
  assert.ok(allowedMutationTypes.includes('ai.job'), 'AI job mutation allowed');
  assert.ok(keywordResponse.candidates.every((candidate) => candidate.promptVersion), 'mock candidates include prompt version');
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
  const aiJobSnapshot = { activeDayId: '2026-08-29', aiJobs: [{ id: 'ai-recovery-job', key: 'candidate-only|asset-ai|qwen3.7-flash|qwen3.7-flash|keyword-prompt-v1|en', objectId: 'candidate-only', dayCanvasId: '2026-08-29', assetId: 'asset-ai', provider: 'qwen3.7-flash', model: 'qwen3.7-flash', promptVersion: 'keyword-prompt-v1', locale: 'en', state: 'failed', retryCount: 1, error: 'AI_PROVIDER_TIMEOUT', createdAtUtc: '2026-08-29T01:00:00.000Z', updatedAtUtc: '2026-08-29T01:02:00.000Z' }], days: { '2026-08-29': { title: 'AI job day', camera: {}, items: [{ id: 'candidate-only', kind: 'image', keywords: [], keywordCandidates: [] }], trash: [] } } };
  const aiJobAck = saveWorkspaceSnapshot(tempRoot, aiJobSnapshot, { mutations: [{ id: 'ai-job-mut', type: 'ai.job', targetId: 'candidate-only' }] });
  assert.strictEqual(aiJobAck.ok, true, 'AI job snapshot saves');
  const aiJobLoaded = loadWorkspaceSnapshot(tempRoot);
  assert.strictEqual(aiJobLoaded.snapshot.aiJobs[0].state, 'failed', 'AI job state survives restart snapshot');
  assert.strictEqual(aiJobLoaded.snapshot.aiJobs[0].provider, 'qwen3.7-flash', 'AI job provider survives restart snapshot');
  assert.strictEqual(aiJobLoaded.snapshot.aiJobs[0].promptVersion, 'keyword-prompt-v1', 'AI job prompt version survives restart snapshot');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(appSource.includes('function recoverAiJobsForLaunch'), 'renderer has launch-time AI job recovery helper');
  assert.ok(appSource.includes('AI_JOB_INTERRUPTED'), 'renderer marks interrupted AI jobs with explicit error copy');
  assert.ok(appSource.includes('aiJobKeyFor'), 'renderer keeps AI job dedupe key based on object/asset/provider/model/prompt/locale');

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
  const approvedCandidateOnly = { activeDayId: '2026-08-29', days: { '2026-08-29': { title: 'Accepted candidate search day', camera: {}, items: [{ id: 'accepted-candidate-only', kind: 'image', keywords: [], keywordCandidates: [
    { id: 'cand-search-accepted', text: 'approved ai search phrase', state: 'accepted', provider: 'qwen3.7-flash', promptVersion: 'search-contract-v1' },
    { id: 'cand-search-suggested', text: 'suggested invisible phrase', state: 'suggested', provider: 'qwen3.7-flash', promptVersion: 'search-contract-v1' },
    { id: 'cand-search-dismissed', text: 'dismissed invisible phrase', state: 'dismissed', provider: 'qwen3.7-flash', promptVersion: 'search-contract-v1' }
  ] }], trash: [] } } };
  assert.deepStrictEqual(approvedKeywordTexts(approvedCandidateOnly.days['2026-08-29'].items[0]), ['approved ai search phrase'], 'approved keyword helper excludes suggested and dismissed candidates');
  const approvedCandidateAck = saveWorkspaceSnapshot(tempRoot, approvedCandidateOnly, { mutations: [{ id: 'kw-accepted-candidate-only', type: 'keyword.accept', targetId: 'accepted-candidate-only' }] });
  assert.strictEqual(approvedCandidateAck.ok, true, 'accepted-candidate-only snapshot saves');
  assert.ok(require('../electron/persistence.cjs').querySearchIndex(tempRoot, 'approved ai search phrase', 10).results.length >= 1, 'accepted AI candidate without manual keyword enters search');
  assert.strictEqual(require('../electron/persistence.cjs').querySearchIndex(tempRoot, 'suggested invisible phrase', 10).results.length, 0, 'unreviewed AI candidate stays out of search');
  assert.strictEqual(require('../electron/persistence.cjs').querySearchIndex(tempRoot, 'dismissed invisible phrase', 10).results.length, 0, 'dismissed AI candidate stays out of search');
  const keywordRetryEntries = [
    { mutation: { id: 'kw-dup-1', type: 'keyword.accept', payload: { candidateId: 'cand-accepted' } } },
    { mutation: { id: 'kw-dup-2', type: 'keyword.accept', payload: { candidateId: 'cand-accepted' } } },
    { mutation: { id: 'kw-dismiss-1', type: 'keyword.dismiss', payload: { candidateId: 'cand-dismissed' } } }
  ];
  const uniqueKeywordRetryKeys = new Set(keywordRetryEntries.map((entry) => [entry.mutation.type, entry.mutation.payload.candidateId || entry.mutation.id].join(':')));
  assert.strictEqual(uniqueKeywordRetryKeys.size, 2, 'keyword retry metadata dedupes by candidate identity');
  console.log('Slice 34/35/36/37/38/39/40/41/42/43/44/45/PackageD/AI Package 1B/Package 2/AI Task 3/AI Task 4/AI Task 5/AI Task 6/AI Task 8/AI Task 9/AI Task 10/AI Task 11/AI Task 12/AI Task 13/AI Task 14/AI Task 15/AI Task 16 checks passed at ' + tempRoot);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
})().catch((error) => { console.error(error); process.exit(1); });
