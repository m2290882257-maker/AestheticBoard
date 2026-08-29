const gatewaySchemaVersion = 1;
const providerConfigSchemaVersion = 1;
const providerConsentVersion = 'provider-consent-v1';
const maxCandidateCount = 8;
const maxKeywordLength = 48;
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
    updatedAtUtc: new Date().toISOString()
  };
}

function sanitizeProviderConfig(input = {}) {
  const defaults = defaultProviderConfig();
  const requestedProvider = String(input.activeProvider || input.provider || defaults.activeProvider);
  const activeProvider = providerRegistry[requestedProvider] ? requestedProvider : defaults.activeProvider;
  const provider = providerRegistry[activeProvider] || providerRegistry['local-mock'];
  return {
    ...defaults,
    schemaVersion: providerConfigSchemaVersion,
    activeProvider,
    consentVersion: String(input.consentVersion || defaults.consentVersion),
    externalProviderEnabled: Boolean(input.externalProviderEnabled && provider.external && provider.enabled),
    allowImageAccess: Boolean(input.allowImageAccess && provider.canReadImage && provider.enabled && provider.external),
    allowTextAccess: provider.canReadText ? Boolean(input.allowTextAccess ?? defaults.allowTextAccess) : false,
    allowNetwork: Boolean(input.allowNetwork && provider.requiresNetwork && provider.enabled && provider.external),
    updatedAtUtc: String(input.updatedAtUtc || defaults.updatedAtUtc)
  };
}

function providerStateFromConfig(input = {}) {
  const config = sanitizeProviderConfig(input);
  const active = providerRegistry[config.activeProvider] || providerRegistry['local-mock'];
  return {
    activeProvider: active.id,
    activeProviderLabel: active.label,
    localMockAvailable: true,
    externalProviderEnabled: Boolean(config.externalProviderEnabled),
    externalProviderRequiresOptIn: true,
    modeLabel: active.label,
    privacyLabel: active.external ? 'External provider disabled until explicit opt-in' : 'No remote AI request is made by default',
    consentVersion: config.consentVersion,
    permissions: {
      imageAccess: Boolean(config.allowImageAccess),
      textAccess: Boolean(config.allowTextAccess),
      network: Boolean(config.allowNetwork)
    },
    providers: providerCapabilities(),
    config
  };
}

function validateKeywordProviderRequest(input = {}) {
  const config = sanitizeProviderConfig(input.providerConfig || input.config || {});
  const providerId = String(input.provider || config.activeProvider || 'local-mock');
  const provider = providerRegistry[providerId];
  if (!provider) return { ok: false, error: 'KEYWORD_PROVIDER_UNKNOWN', providerId, config };
  if (provider.external && !input.externalProviderOptIn) return { ok: false, error: 'KEYWORD_PROVIDER_REQUIRES_OPT_IN', providerId, provider: { ...provider }, config };
  if (!provider.enabled) return { ok: false, error: 'KEYWORD_PROVIDER_DISABLED', providerId, provider: { ...provider }, config };
  if (provider.external && (!config.externalProviderEnabled || !config.allowNetwork)) return { ok: false, error: 'KEYWORD_PROVIDER_CONSENT_REQUIRED', providerId, provider: { ...provider }, config };
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
    object: {
      id: String(object.id || ''),
      kind: object.kind === 'link' ? 'link' : 'image',
      sourceType: String(object.sourceType || ''),
      sourceUrl: String(object.sourceUrl || object.url || ''),
      note: String(object.note || '').slice(0, 1000),
      keywords: Array.isArray(object.keywords) ? object.keywords.map(String).slice(0, 20) : []
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
    createdAtUtc: new Date().toISOString()
  }));
  return {
    ok: true,
    schemaVersion: gatewaySchemaVersion,
    provider: 'local-mock',
    requestId: request.requestId,
    generatedAtUtc: new Date().toISOString(),
    candidates
  };
}

function generateMockKeywordCandidates(input = {}) {
  const validation = validateKeywordProviderRequest(input);
  if (!validation.ok) return { ok: false, schemaVersion: gatewaySchemaVersion, provider: String(input.provider || 'local-mock'), error: validation.error, providerDetail: validation.provider || null };
  if (validation.provider.id !== 'local-mock') return { ok: false, schemaVersion: gatewaySchemaVersion, provider: validation.provider.id, error: 'KEYWORD_PROVIDER_NOT_RUNNABLE' };
  const request = buildKeywordRequest({ ...input, provider: validation.provider.id });
  return mockKeywordResponse(request);
}

function generateKeywordCandidates(input = {}) {
  const validation = validateKeywordProviderRequest(input);
  if (!validation.ok) return { ok: false, schemaVersion: gatewaySchemaVersion, provider: String(input.provider || 'local-mock'), error: validation.error, providerDetail: validation.provider || null, config: validation.config || null };
  if (validation.provider.external) return { ok: false, schemaVersion: gatewaySchemaVersion, provider: validation.provider.id, error: 'KEYWORD_PROVIDER_EXTERNAL_UNIMPLEMENTED', providerDetail: validation.provider, config: validation.config || null };
  return generateMockKeywordCandidates({ ...input, provider: validation.provider.id, providerConfig: validation.config });
}

function keywordProviderState(config = {}) {
  return providerStateFromConfig(config);
}

module.exports = { gatewaySchemaVersion, providerConfigSchemaVersion, providerConsentVersion, maxCandidateCount, providerRegistry, providerCapabilities, defaultProviderConfig, sanitizeProviderConfig, providerStateFromConfig, validateKeywordProviderRequest, buildKeywordRequest, generateMockKeywordCandidates, generateKeywordCandidates, keywordProviderState };
