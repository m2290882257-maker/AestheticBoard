const fs = require('fs');
const path = require('path');
const { resolveAssetPath } = require('./media-store.cjs');

const connectorSchemaVersion = 1;
const keywordResponseSchemaVersion = 1;
const maxProviderCandidateCount = 8;
const maxProviderKeywordLength = 48;
const minProviderKeywordLength = 2;
const defaultProviderTimeoutMs = 60000;
const qwenPromptPath = path.join(__dirname, '..', 'docs', 'QWEN_KEYWORD_PROMPT.md');

const providerErrorCodes = Object.freeze({
  PROVIDER_UNKNOWN: 'AI_PROVIDER_UNKNOWN',
  PROVIDER_DISABLED: 'AI_PROVIDER_DISABLED',
  PROVIDER_REQUIRES_OPT_IN: 'AI_PROVIDER_REQUIRES_OPT_IN',
  PROVIDER_CONSENT_REQUIRED: 'AI_PROVIDER_CONSENT_REQUIRED',
  PROVIDER_NOT_IMPLEMENTED: 'AI_PROVIDER_NOT_IMPLEMENTED',
  PROVIDER_SCHEMA_INVALID: 'AI_PROVIDER_SCHEMA_INVALID',
  IMAGE_NOT_DURABLE: 'AI_IMAGE_NOT_DURABLE',
  WORKING_DERIVATIVE_MISSING: 'AI_WORKING_DERIVATIVE_MISSING',
  MISSING_API_KEY: 'AI_MISSING_API_KEY',
  PROVIDER_AUTH_FAILED: 'AI_PROVIDER_AUTH_FAILED',
  PROVIDER_MODEL_NOT_FOUND: 'AI_PROVIDER_MODEL_NOT_FOUND',
  PROVIDER_TIMEOUT: 'AI_PROVIDER_TIMEOUT',
  PROVIDER_RATE_LIMITED: 'AI_PROVIDER_RATE_LIMITED',
  PROVIDER_NETWORK_ERROR: 'AI_PROVIDER_NETWORK_ERROR'
});

function createFailure(code, detail = {}) {
  return { ok: false, schemaVersion: connectorSchemaVersion, error: code, ...detail };
}

function assertRunnableProvider(provider, config = {}, request = {}) {
  if (!provider) return createFailure(providerErrorCodes.PROVIDER_UNKNOWN);
  const hasOptIn = Boolean(request.externalProviderOptIn || config.externalProviderEnabled);
  if (provider.external && !hasOptIn) {
    return createFailure(providerErrorCodes.PROVIDER_REQUIRES_OPT_IN, { providerId: provider.id, provider: { ...provider } });
  }
  if (!provider.enabled) {
    return createFailure(providerErrorCodes.PROVIDER_DISABLED, { providerId: provider.id, provider: { ...provider } });
  }
  if (provider.external && (!config.externalProviderEnabled || !config.allowNetwork)) {
    return createFailure(providerErrorCodes.PROVIDER_CONSENT_REQUIRED, { providerId: provider.id, provider: { ...provider } });
  }
  return { ok: true };
}

function durableMediaState(object = {}) {
  const lifecycleState = String(object.lifecycleState || object.captureState || '').toUpperCase();
  const variants = object.media?.variants || object.variants || {};
  const working = variants.working || object.workingVariant || object.workingRelpath || object.assetUri;
  return {
    durable: Boolean(object.assetId) && (lifecycleState === 'DURABLE' || lifecycleState === 'READY' || lifecycleState === ''),
    workingAvailable: Boolean(working || object.assetId),
    assetId: String(object.assetId || ''),
    sha256: String(object.sha256 || '')
  };
}

function buildProviderKeywordJob(input = {}) {
  const provider = input.provider && typeof input.provider === 'object' ? input.provider : {};
  const object = input.object && typeof input.object === 'object' ? input.object : {};
  const media = durableMediaState(object);
  if (provider.external && object.kind !== 'link' && !media.durable) {
    return createFailure(providerErrorCodes.IMAGE_NOT_DURABLE, { providerId: provider.id, objectId: String(object.id || '') });
  }
  if (provider.external && provider.canReadImage && object.kind !== 'link' && !media.workingAvailable) {
    return createFailure(providerErrorCodes.WORKING_DERIVATIVE_MISSING, { providerId: provider.id, objectId: String(object.id || '') });
  }
  return {
    ok: true,
    schemaVersion: connectorSchemaVersion,
    job: {
      jobId: String(input.jobId || input.requestId || 'ai-job-' + Date.now()),
      providerId: String(provider.id || input.providerId || ''),
      promptVersion: String(input.promptVersion || 'keyword-prompt-v1'),
      locale: String(input.locale || 'en'),
      object: {
        id: String(object.id || ''),
        kind: object.kind === 'link' ? 'link' : 'image',
        sourceType: String(object.sourceType || ''),
        sourceUrl: String(object.sourceUrl || object.url || ''),
        note: String(object.note || '').slice(0, 1000),
        keywords: Array.isArray(object.keywords) ? object.keywords.map(String).slice(0, 20) : [],
        assetId: media.assetId,
        sha256: media.sha256
      }
    }
  };
}

function normalizeCandidate(candidate = {}, index = 0, context = {}) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const rawText = String(candidate.text || candidate.keyword || candidate.en || '').trim();
  if (rawText.length > 140) return null;
  const text = rawText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxProviderKeywordLength);
  if (text.length < minProviderKeywordLength) return null;
  const confidence = Number(candidate.confidence);
  const zh = candidate.zh || candidate.translationZh || '';
  if (zh && typeof zh !== 'string') return null;
  return {
    id: String(candidate.id || context.requestId + '-cand-' + index),
    text,
    zh: String(zh).slice(0, 80),
    dimension: String(candidate.dimension || candidate.type || 'general').slice(0, 40),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
    source: String(candidate.source || context.providerId || 'provider').slice(0, 80),
    provider: String(candidate.provider || context.providerId || 'provider').slice(0, 80),
    promptVersion: String(candidate.promptVersion || context.promptVersion || 'keyword-prompt-v1'),
    state: ['suggested', 'accepted', 'dismissed'].includes(candidate.state) ? candidate.state : 'suggested',
    createdAtUtc: String(candidate.createdAtUtc || candidate.generatedAtUtc || context.generatedAtUtc || new Date().toISOString()),
    reviewedAtUtc: String(candidate.reviewedAtUtc || ''),
    acceptedAtUtc: String(candidate.acceptedAtUtc || ''),
    dismissedAtUtc: String(candidate.dismissedAtUtc || ''),
    pinnedAtUtc: String(candidate.pinnedAtUtc || '')
  };
}

function validateProviderKeywordResponse(response = {}, context = {}) {
  if (!response || typeof response !== 'object') {
    return createFailure(providerErrorCodes.PROVIDER_SCHEMA_INVALID, { reason: 'response must be an object' });
  }
  if (response.ok !== true) {
    return createFailure(response.error || providerErrorCodes.PROVIDER_SCHEMA_INVALID, { providerId: context.providerId || response.provider || '' });
  }
  if (!Array.isArray(response.candidates)) {
    return createFailure(providerErrorCodes.PROVIDER_SCHEMA_INVALID, { reason: 'candidates must be an array' });
  }
  if (!response.candidates.length) {
    return createFailure(providerErrorCodes.PROVIDER_SCHEMA_INVALID, { reason: 'candidate output is empty' });
  }
  const promptVersion = String(response.promptVersion || context.promptVersion || 'keyword-prompt-v1');
  const seen = new Set();
  const candidates = [];
  let invalidCount = 0;
  let duplicateCount = 0;
  response.candidates.forEach((candidate, index) => {
    const normalized = normalizeCandidate(candidate, index, {
      requestId: context.requestId || response.requestId || 'ai-response',
      providerId: context.providerId || response.provider || candidate?.provider || '',
      promptVersion,
      generatedAtUtc: response.generatedAtUtc
    });
    if (!normalized) { invalidCount += 1; return; }
    if (seen.has(normalized.text)) { duplicateCount += 1; return; }
    seen.add(normalized.text);
    candidates.push(normalized);
  });
  if (!candidates.length) {
    return createFailure(providerErrorCodes.PROVIDER_SCHEMA_INVALID, { reason: 'at least one valid candidate is required', invalidCount, duplicateCount });
  }
  if (invalidCount >= response.candidates.length) {
    return createFailure(providerErrorCodes.PROVIDER_SCHEMA_INVALID, { reason: 'all candidates were invalid', invalidCount, duplicateCount });
  }
  return {
    ok: true,
    schemaVersion: keywordResponseSchemaVersion,
    provider: String(response.provider || context.providerId || ''),
    requestId: String(response.requestId || context.requestId || ''),
    promptVersion,
    generatedAtUtc: String(response.generatedAtUtc || new Date().toISOString()),
    quality: { inputCount: response.candidates.length, acceptedCount: candidates.length, duplicateCount, invalidCount },
    candidates: candidates.slice(0, maxProviderCandidateCount)
  };
}

function providerOption(config = {}, providerId = '') {
  const options = config.providerOptions && typeof config.providerOptions === 'object' ? config.providerOptions : {};
  return options[providerId] && typeof options[providerId] === 'object' ? options[providerId] : {};
}

function qwenApiKey(env = process.env) {
  return String(env.AESTHETICBOARD_QWEN_API_KEY || env.DASHSCOPE_API_KEY || '').trim();
}

function normalizeBaseUrl(value) {
  return String(value || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '');
}

function qwenChatCompletionsUrl(baseUrl) {
  return normalizeBaseUrl(baseUrl) + '/chat/completions';
}

function qwenEffectiveOptions(config = {}, options = {}) {
  const providerId = String(options.providerId || 'qwen3.7-flash');
  const providerOptions = providerOption(config, providerId);
  const env = options.env || process.env;
  const model = String(env.AESTHETICBOARD_QWEN_MODEL || providerOptions.model || options.model || 'qwen3.7-flash');
  const baseUrl = normalizeBaseUrl(env.AESTHETICBOARD_QWEN_BASE_URL || providerOptions.baseUrl || options.baseUrl);
  const timeoutMs = Number(env.AESTHETICBOARD_QWEN_TIMEOUT_MS || providerOptions.timeoutMs || options.timeoutMs || defaultProviderTimeoutMs);
  return {
    providerId,
    model,
    baseUrl,
    chatCompletionsUrl: qwenChatCompletionsUrl(baseUrl),
    timeoutMs,
    apiKeyAvailable: Boolean(qwenApiKey(env)),
    apiKeySource: env.AESTHETICBOARD_QWEN_API_KEY ? 'AESTHETICBOARD_QWEN_API_KEY' : env.DASHSCOPE_API_KEY ? 'DASHSCOPE_API_KEY' : 'not set',
    modelSource: env.AESTHETICBOARD_QWEN_MODEL ? 'AESTHETICBOARD_QWEN_MODEL' : providerOptions.model ? 'profile config' : 'default',
    baseUrlSource: env.AESTHETICBOARD_QWEN_BASE_URL ? 'AESTHETICBOARD_QWEN_BASE_URL' : providerOptions.baseUrl ? 'profile config' : 'default',
    timeoutSource: env.AESTHETICBOARD_QWEN_TIMEOUT_MS ? 'AESTHETICBOARD_QWEN_TIMEOUT_MS' : providerOptions.timeoutMs ? 'profile config' : 'default'
  };
}

function assetDataUrl(profileRoot, assetId) {
  if (!profileRoot) throw new Error(providerErrorCodes.WORKING_DERIVATIVE_MISSING);
  const assetPath = resolveAssetPath(profileRoot, assetId, 'working');
  if (!assetPath?.fullPath || !fs.existsSync(assetPath.fullPath)) throw new Error(providerErrorCodes.WORKING_DERIVATIVE_MISSING);
  const bytes = fs.readFileSync(assetPath.fullPath);
  return { url: 'data:' + (assetPath.mime || 'image/png') + ';base64,' + bytes.toString('base64'), byteLength: bytes.length, variant: assetPath.variant };
}

function extractPromptBlock(markdown, heading) {
  const headingPattern = new RegExp('^##\\s+\\d+\\.\\s+' + String(heading || '') + '\\s*$', 'im');
  const headingMatch = markdown.match(headingPattern);
  if (!headingMatch || typeof headingMatch.index !== 'number') return '';
  const afterHeading = markdown.slice(headingMatch.index + headingMatch[0].length);
  const fenceMatch = afterHeading.match(/```(?:text|md|markdown)?\s*([\s\S]*?)```/i);
  return fenceMatch ? fenceMatch[1].trim() : '';
}

function normalizePromptVersion(value) {
  const raw = String(value || '').trim();
  const clean = raw.replace(/^[\"'`]+|[\"'`]+$/g, '').trim();
  if (!clean || clean.length > 80) return '';
  if (!/^[a-zA-Z0-9._:-]+$/.test(clean)) return '';
  return clean;
}

function extractPromptVersion(markdown) {
  const text = String(markdown || '');
  const patterns = [
    /\*\*Version:\*\*\s*([^\r\n]+)/i,
    /^version\s*[:=]\s*([^\r\n]+)/im,
    /^promptVersion\s*[:=]\s*([^\r\n]+)/im,
    /[\"']promptVersion[\"']\s*:\s*[\"']([^\"']+)[\"']/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const version = normalizePromptVersion(match && match[1]);
    if (version) return version;
  }
  return '';
}

function loadQwenPromptTemplate() {
  const fallbackSystem = [
    'You are a professional visual-reference search keyword generator.',
    'Return only valid JSON. Optimize for visual retrieval similarity, not OCR or general captioning.',
    'Return either a JSON array of { "en": "...", "zh": "..." } items or an object with a keywords array.'
  ].join('\n');
  const fallbackUser = 'Please analyze the attached image and return visual-reference search keywords according to the system instructions.';
  try {
    const markdown = fs.readFileSync(qwenPromptPath, 'utf8');
    const explicitVersion = extractPromptVersion(markdown);
    return {
      system: extractPromptBlock(markdown, 'System Prompt') || fallbackSystem,
      user: extractPromptBlock(markdown, 'User Prompt') || fallbackUser,
      promptVersion: explicitVersion || 'qwen-keyword-prompt-md-v1',
      promptVersionSource: explicitVersion ? 'docs/QWEN_KEYWORD_PROMPT.md' : 'fallback-no-explicit-version'
    };
  } catch {
    return { system: fallbackSystem, user: fallbackUser, promptVersion: 'qwen-keyword-prompt-fallback-v1', promptVersionSource: 'built-in fallback' };
  }
}

function qwenConnectionPromptTemplate() {
  return {
    system: 'You are verifying an AI keyword provider connection. Return only valid JSON in the requested schema.',
    user: 'Connection test only. Do not require an image. Return {"keywords":[{"en":"provider connection","zh":"provider connection"}]} exactly enough to prove JSON output works.',
    promptVersion: 'qwen-provider-connection-test-v1'
  };
}

function buildKeywordPrompt(job = {}) {
  const object = job.object || {};
  return [
    loadQwenPromptTemplate().user,
    'Existing user keywords: ' + (object.keywords || []).join(', '),
    'Note text: ' + (object.note || ''),
    'Source type: ' + (object.sourceType || object.kind || 'image')
  ].join('\n');
}

function parseProviderJsonContent(content) {
  const text = String(content || '').trim();
  if (!text) throw new Error(providerErrorCodes.PROVIDER_SCHEMA_INVALID);
  try { return JSON.parse(text); } catch {}
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) return JSON.parse(arrayMatch[0]);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(providerErrorCodes.PROVIDER_SCHEMA_INVALID);
  return JSON.parse(match[0]);
}

function mapHttpStatus(status, bodyText = '') {
  const body = String(bodyText || '');
  if (status === 401 || status === 403) return providerErrorCodes.PROVIDER_AUTH_FAILED;
  if (status === 404 || /model[^a-z0-9]*(not\s*found|not\s*exist|does\s*not\s*exist|invalid|unknown)|not\s*found[^a-z0-9]*model/i.test(body)) return providerErrorCodes.PROVIDER_MODEL_NOT_FOUND;
  if (status === 408 || status === 504) return providerErrorCodes.PROVIDER_TIMEOUT;
  if (status === 429) return providerErrorCodes.PROVIDER_RATE_LIMITED;
  return providerErrorCodes.PROVIDER_NETWORK_ERROR;
}

async function callQwenKeywordProvider(jobRequest = {}, options = {}) {
  const job = jobRequest.job || jobRequest;
  const providerId = String(job.providerId || 'qwen3.7-flash');
  const config = options.providerConfig || {};
  const providerOptions = providerOption(config, providerId);
  const effective = qwenEffectiveOptions(config, { ...options, providerId });
  const apiKey = qwenApiKey(options.env || process.env);
  if (!apiKey) return createFailure(providerErrorCodes.MISSING_API_KEY, { providerId, jobId: job.jobId || '', diagnostics: effective });
  const baseUrl = effective.baseUrl;
  const model = effective.model;
  let media = null;
  try {
    if (job.object?.kind !== 'link') media = assetDataUrl(options.profileRoot, job.object?.assetId);
  } catch (error) {
    return createFailure(error?.message || providerErrorCodes.WORKING_DERIVATIVE_MISSING, { providerId, jobId: job.jobId || '' });
  }
  const controller = new AbortController();
  const timeoutMs = Number(providerOptions.timeoutMs || options.timeoutMs || defaultProviderTimeoutMs);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const isConnectionTest = job.object?.sourceType === 'provider-test-no-board-image';
  try {
    const promptTemplate = isConnectionTest ? qwenConnectionPromptTemplate() : loadQwenPromptTemplate();
    const content = [];
    if (media) content.push({ type: 'image_url', image_url: { url: media.url } });
    content.push({ type: 'text', text: isConnectionTest ? promptTemplate.user : buildKeywordPrompt(job) });
    const response = await fetch(qwenChatCompletionsUrl(baseUrl), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: promptTemplate.system },
          { role: 'user', content }
        ],
        temperature: 0.2,
        max_tokens: 700,
        stream: false
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      let bodyText = '';
      try { bodyText = await response.text(); } catch {}
      return createFailure(mapHttpStatus(response.status, bodyText), { providerId, jobId: job.jobId || '', status: response.status, diagnostics: effective });
    }
    const payload = await response.json();
    const message = payload?.choices?.[0]?.message?.content;
    const parsed = typeof message === 'string' ? parseProviderJsonContent(message) : message;
    const candidates = Array.isArray(parsed) ? parsed : (parsed?.candidates || parsed?.keywords);
    return validateProviderKeywordResponse({
      ok: true,
      provider: providerId,
      requestId: job.jobId,
      generatedAtUtc: new Date().toISOString(),
      promptVersion: promptTemplate.promptVersion,
      candidates
    }, { providerId, requestId: job.jobId, promptVersion: promptTemplate.promptVersion });
  } catch (error) {
    const code = error?.name === 'AbortError' ? providerErrorCodes.PROVIDER_TIMEOUT : error?.message === providerErrorCodes.PROVIDER_SCHEMA_INVALID || error instanceof SyntaxError ? providerErrorCodes.PROVIDER_SCHEMA_INVALID : providerErrorCodes.PROVIDER_NETWORK_ERROR;
    return createFailure(code, { providerId, jobId: job.jobId || '', message: error?.message || code });
  } finally {
    clearTimeout(timeout);
  }
}

function runProviderKeywordJob(jobRequest = {}, options = {}) {
  const providerId = String(jobRequest.providerId || jobRequest.job?.providerId || '');
  if (providerId === 'qwen3.7-flash') return callQwenKeywordProvider(jobRequest, options);
  return createFailure(providerErrorCodes.PROVIDER_NOT_IMPLEMENTED, {
    providerId,
    jobId: String(jobRequest.jobId || jobRequest.job?.jobId || ''),
    message: 'Real provider connector is scaffolded but no API implementation is enabled in this build.'
  });
}

function testProviderConnection(providerId, options = {}) {
  if (String(providerId) !== 'qwen3.7-flash') {
    return createFailure(providerErrorCodes.PROVIDER_NOT_IMPLEMENTED, { providerId: String(providerId || '') });
  }
  const job = {
    jobId: 'provider-test-' + Date.now(),
    providerId: 'qwen3.7-flash',
    promptVersion: 'keyword-provider-test-v1',
    locale: 'en',
    object: {
      id: 'provider-test',
      kind: 'link',
      sourceType: 'provider-test-no-board-image',
      sourceUrl: '',
      note: 'Connection test only. Do not use board images.',
      keywords: ['connection test'],
      assetId: '',
      sha256: ''
    }
  };
  return callQwenKeywordProvider(job, options);
}

module.exports = {
  connectorSchemaVersion,
  keywordResponseSchemaVersion,
  maxProviderCandidateCount,
  maxProviderKeywordLength,
  providerErrorCodes,
  assertRunnableProvider,
  buildProviderKeywordJob,
  validateProviderKeywordResponse,
  runProviderKeywordJob,
  testProviderConnection,
  callQwenKeywordProvider,
  qwenApiKey,
  qwenChatCompletionsUrl,
  mapHttpStatus,
  extractPromptVersion,
  loadQwenPromptTemplate,
  qwenEffectiveOptions
};
