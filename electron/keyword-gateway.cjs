const gatewaySchemaVersion = 1;
const providerConfigSchemaVersion = 1;
const providerConsentVersion = 'provider-consent-v1';
const maxCandidateCount = 8;
const maxKeywordLength = 48;
const {
  providerErrorCodes,
  assertRunnableProvider,
  buildProviderKeywordJob,
  validateProviderKeywordResponse,
  runProviderKeywordJob,
  qwenEffectiveOptions,
  qwenApiKey,
  loadQwenPromptTemplate
} = require('./ai-provider-connectors.cjs');
const providerRegistry = Object.freeze({
  'local-mock': Object.freeze({
    id: 'local-mock',
    label: 'Local mock only',
    mode: 'local',
    enabled: true,
    external: false,
    requiresOptIn: false,
    canReadImage: false,
    canReadText: true,
    requiresNetwork: false,
    consentCopy: 'Runs locally with mock suggestions. It can read object text but does not upload images or contact a network provider.',
    description: 'Development-only local keyword suggestions. No cloud request is made.'
  }),
  'qwen3.7-flash': Object.freeze({
    id: 'qwen3.7-flash',
    label: 'Qwen3.7 Flash',
    mode: 'external',
    enabled: true,
    external: true,
    requiresOptIn: true,
    canReadImage: true,
    canReadText: true,
    requiresNetwork: true,
    apiKeyEnv: 'AESTHETICBOARD_QWEN_API_KEY or DASHSCOPE_API_KEY',
    consentCopy: 'Uses the desktop main process to send the working image derivative and approved object text to Qwen only after local opt-in.',
    description: 'DashScope OpenAI-compatible image keyword provider.'
  }),
  'gpt-5.7-luna': Object.freeze({
    id: 'gpt-5.7-luna',
    label: 'GPT-5.7 Luna',
    mode: 'external',
    enabled: false,
    external: true,
    requiresOptIn: true,
    canReadImage: true,
    canReadText: true,
    requiresNetwork: true,
    apiKeyEnv: 'not configured',
    consentCopy: 'Reserved for a later implementation. It cannot run or make a network request in this build.',
    description: 'Disabled placeholder for a future GPT-5.7 Luna provider.'
  }),
  'external-placeholder': Object.freeze({
    id: 'external-placeholder',
    label: 'External provider placeholder',
    mode: 'external',
    enabled: false,
    external: true,
    requiresOptIn: true,
    canReadImage: true,
    canReadText: true,
    requiresNetwork: true,
    consentCopy: 'Would require explicit user opt-in before image, text, or network access. It is disabled in this build.',
    description: 'Disabled placeholder for a future explicit opt-in provider.'
  })
});

function providerCapabilities() {
  return Object.values(providerRegistry).map((provider) => ({ ...provider }));
}


function defaultProviderConfig() {
  return {
    schemaVersion: providerConfigSchemaVersion,
    activeProvider: 'local-mock',
    consentVersion: providerConsentVersion,
    externalProviderEnabled: false,
    allowImageAccess: false,
    allowTextAccess: true,
    allowNetwork: false,
    providerOptions: {
      'qwen3.7-flash': {
        model: 'qwen3.7-flash',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        timeoutMs: 60000
      }
    },
    updatedAtUtc: new Date().toISOString()
  };
}

function sanitizeProviderConfig(input = {}) {
  const defaults = defaultProviderConfig();
  const requestedProvider = String(input.activeProvider || input.provider || defaults.activeProvider);
  const registeredProvider = providerRegistry[requestedProvider] ? requestedProvider : defaults.activeProvider;
  const activeProvider = providerRegistry[registeredProvider]?.enabled ? registeredProvider : defaults.activeProvider;
  const provider = providerRegistry[activeProvider] || providerRegistry['local-mock'];
  const providerOptions = input.providerOptions && typeof input.providerOptions === 'object' ? input.providerOptions : {};
  const sanitizedOptions = {};
  Object.entries(providerOptions).forEach(([id, options]) => {
    if (!providerRegistry[id] || !options || typeof options !== 'object') return;
    sanitizedOptions[id] = {
      model: String(options.model || id).slice(0, 120),
      baseUrl: String(options.baseUrl || '').slice(0, 500),
      timeoutMs: Number(options.timeoutMs || 60000)
    };
  });
  return {
    ...defaults,
    schemaVersion: providerConfigSchemaVersion,
    activeProvider,
    consentVersion: String(input.consentVersion || defaults.consentVersion),
    externalProviderEnabled: Boolean(input.externalProviderEnabled && provider.external && provider.enabled),
    allowImageAccess: Boolean(input.allowImageAccess && provider.canReadImage && provider.enabled && provider.external),
    allowTextAccess: provider.canReadText ? Boolean(input.allowTextAccess ?? defaults.allowTextAccess) : false,
    allowNetwork: Boolean(input.allowNetwork && provider.requiresNetwork && provider.enabled && provider.external),
    providerOptions: { ...defaults.providerOptions, ...sanitizedOptions },
    updatedAtUtc: String(input.updatedAtUtc || defaults.updatedAtUtc)
  };
}

function providerKeyStatusFromConfig(config = {}, env = process.env) {
  const sanitized = sanitizeProviderConfig(config);
  const qwen = qwenEffectiveOptions(sanitized, { env, providerId: 'qwen3.7-flash' });
  return {
    qwen: {
      providerId: qwen.providerId,
      available: Boolean(qwen.apiKeyAvailable),
      source: qwen.apiKeySource,
      secretVisibleToRenderer: false
    }
  };
}

function providerDiagnosticsFromConfig(config = {}, env = process.env) {
  const sanitized = sanitizeProviderConfig(config);
  const qwen = qwenEffectiveOptions(sanitized, { env, providerId: 'qwen3.7-flash' });
  const qwenPrompt = loadQwenPromptTemplate();
  return {
    qwen: {
      providerId: qwen.providerId,
      model: qwen.model,
      baseUrl: qwen.baseUrl,
      timeoutMs: qwen.timeoutMs,
      apiKeyAvailable: Boolean(qwen.apiKeyAvailable),
      apiKeySource: qwen.apiKeySource,
      modelSource: qwen.modelSource,
      baseUrlSource: qwen.baseUrlSource,
      timeoutSource: qwen.timeoutSource,
      promptVersion: qwenPrompt.promptVersion,
      promptVersionSource: qwenPrompt.promptVersionSource || 'unknown'
    },
    activeProvider: sanitized.activeProvider,
    externalProviderEnabled: Boolean(sanitized.externalProviderEnabled),
    apiKeyStatus: providerKeyStatusFromConfig(sanitized, env)
  };
}

function providerStateFromConfig(input = {}, env = process.env) {
  const config = sanitizeProviderConfig(input);
  const active = providerRegistry[config.activeProvider] || providerRegistry['local-mock'];
  return {
    activeProvider: active.id,
    activeProviderLabel: active.label,
    localMockAvailable: true,
    externalProviderEnabled: Boolean(config.externalProviderEnabled),
    externalProviderRequiresOptIn: true,
    modeLabel: active.label,
    privacyLabel: active.external ? (config.externalProviderEnabled ? active.label + ' may use image/text/network after opt-in' : 'External provider disabled until explicit opt-in') : 'No remote AI request is made by default',
    consentVersion: config.consentVersion,
    permissions: {
      imageAccess: Boolean(config.allowImageAccess),
      textAccess: Boolean(config.allowTextAccess),
      network: Boolean(config.allowNetwork)
    },
    diagnostics: providerDiagnosticsFromConfig(config, env),
    providers: providerCapabilities(),
    config
  };
}

function validateKeywordProviderRequest(input = {}) {
  const config = sanitizeProviderConfig(input.providerConfig || input.config || {});
  const providerId = String(input.provider || config.activeProvider || 'local-mock');
  const provider = providerRegistry[providerId];
  const runnable = assertRunnableProvider(provider, config, input);
  if (!runnable.ok) return { ok: false, error: runnable.error, providerId, provider: runnable.provider || null, config };
  return { ok: true, provider: { ...provider }, config };
}

function cleanKeyword(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxKeywordLength);
}

function uniqueKeywords(values) {
  const seen = new Set();
  const output = [];
  values.forEach((value) => {
    const keyword = cleanKeyword(value);
    if (!keyword || seen.has(keyword)) return;
    seen.add(keyword);
    output.push(keyword);
  });
  return output.slice(0, maxCandidateCount);
}

function hostWords(url) {
  try {
    return new URL(String(url || '')).hostname.replace(/^www\./, '').split(/[.-]/).filter(Boolean);
  } catch {
    return [];
  }
}

function noteWords(note) {
  return String(note || '')
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length >= 4 && word.length <= 16)
    .slice(0, 4);
}

function buildKeywordRequest(input = {}) {
  const object = input.object && typeof input.object === 'object' ? input.object : {};
  return {
    schemaVersion: gatewaySchemaVersion,
    provider: String(input.provider || 'local-mock'),
    requestId: String(input.requestId || 'kw-' + Date.now()),
    promptVersion: String(input.promptVersion || 'keyword-prompt-v1'),
    locale: String(input.locale || 'en'),
    object: {
      id: String(object.id || ''),
      kind: object.kind === 'link' ? 'link' : 'image',
      sourceType: String(object.sourceType || ''),
      sourceUrl: String(object.sourceUrl || object.url || ''),
      note: String(object.note || '').slice(0, 1000),
      keywords: Array.isArray(object.keywords) ? object.keywords.map(String).slice(0, 20) : [],
      lifecycleState: String(object.lifecycleState || ''),
      assetId: String(object.assetId || ''),
      sha256: String(object.sha256 || ''),
      media: object.media && typeof object.media === 'object' ? object.media : null
    }
  };
}

function mockKeywordResponse(request) {
  const sourceType = request.object.sourceType || (request.object.kind === 'link' ? 'link capture' : 'image capture');
  const base = request.object.kind === 'link'
    ? ['web reference', 'source trail', 'research clue', 'saved link']
    : ['visual memory', 'composition note', 'material mood', 'image reference'];
  const candidates = uniqueKeywords([
    ...base,
    sourceType,
    ...hostWords(request.object.sourceUrl),
    ...noteWords(request.object.note),
    ...request.object.keywords.map((keyword) => keyword + ' variation')
  ]).map((text, index) => ({
    id: request.requestId + '-cand-' + index,
    text,
    confidence: Number((0.82 - index * 0.04).toFixed(2)),
    source: 'local-mock',
    provider: 'local-mock',
    state: 'suggested',
    promptVersion: request.promptVersion,
    createdAtUtc: new Date().toISOString()
  }));
  return {
    ok: true,
    schemaVersion: gatewaySchemaVersion,
    provider: 'local-mock',
    requestId: request.requestId,
    generatedAtUtc: new Date().toISOString(),
    promptVersion: request.promptVersion,
    candidates
  };
}

function generateMockKeywordCandidates(input = {}) {
  const validation = validateKeywordProviderRequest(input);
  if (!validation.ok) return { ok: false, schemaVersion: gatewaySchemaVersion, provider: String(input.provider || 'local-mock'), error: validation.error, providerDetail: validation.provider || null };
  if (validation.provider.id !== 'local-mock') return { ok: false, schemaVersion: gatewaySchemaVersion, provider: validation.provider.id, error: 'KEYWORD_PROVIDER_NOT_RUNNABLE' };
  const request = buildKeywordRequest({ ...input, provider: validation.provider.id });
  const response = mockKeywordResponse(request);
  return validateProviderKeywordResponse(response, { providerId: validation.provider.id, requestId: request.requestId, promptVersion: request.promptVersion });
}

function generateKeywordCandidates(input = {}) {
  const validation = validateKeywordProviderRequest(input);
  if (!validation.ok) return { ok: false, schemaVersion: gatewaySchemaVersion, provider: String(input.provider || 'local-mock'), error: validation.error, providerDetail: validation.provider || null, config: validation.config || null };
  if (validation.provider.external) {
    const request = buildKeywordRequest({ ...input, provider: validation.provider.id });
    const job = buildProviderKeywordJob({ ...request, provider: validation.provider });
    if (!job.ok) return { ...job, provider: validation.provider.id, providerDetail: validation.provider, config: validation.config || null };
    const finalize = (response) => response.ok ? validateProviderKeywordResponse(response, { providerId: validation.provider.id, requestId: request.requestId, promptVersion: response.promptVersion || request.promptVersion }) : { ...response, schemaVersion: gatewaySchemaVersion, provider: validation.provider.id, providerDetail: validation.provider, config: validation.config || null };
    const response = runProviderKeywordJob(job, { providerConfig: validation.config, profileRoot: input.profileRoot, env: input.env });
    return response && typeof response.then === 'function' ? response.then(finalize) : finalize(response);
  }
  return generateMockKeywordCandidates({ ...input, provider: validation.provider.id, providerConfig: validation.config });
}

function keywordProviderState(config = {}, env = process.env) {
  return providerStateFromConfig(config, env);
}

module.exports = { gatewaySchemaVersion, providerConfigSchemaVersion, providerConsentVersion, maxCandidateCount, providerRegistry, providerCapabilities, defaultProviderConfig, sanitizeProviderConfig, providerKeyStatusFromConfig, providerDiagnosticsFromConfig, providerStateFromConfig, validateKeywordProviderRequest, buildKeywordRequest, generateMockKeywordCandidates, generateKeywordCandidates, keywordProviderState, providerErrorCodes, buildProviderKeywordJob, validateProviderKeywordResponse, runProviderKeywordJob };
