const assert = require('assert');
const { sanitizeProviderConfig } = require('../electron/keyword-gateway.cjs');
const { testProviderConnection, providerErrorCodes } = require('../electron/ai-provider-connectors.cjs');

(async () => {
  const config = sanitizeProviderConfig({
    activeProvider: 'qwen3.7-flash',
    externalProviderEnabled: true,
    allowImageAccess: true,
    allowTextAccess: true,
    allowNetwork: true,
    providerOptions: {
      'qwen3.7-flash': {
        model: process.env.AESTHETICBOARD_QWEN_MODEL || 'qwen3.7-flash',
        baseUrl: process.env.AESTHETICBOARD_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        timeoutMs: Number(process.env.AESTHETICBOARD_QWEN_TIMEOUT_MS || 60000)
      }
    }
  });
  const result = await testProviderConnection('qwen3.7-flash', { providerConfig: config });
  if (!result.ok) {
    console.error(JSON.stringify({ ok: false, error: result.error, provider: result.provider || result.providerId || 'qwen3.7-flash' }, null, 2));
    if (result.error === providerErrorCodes.MISSING_API_KEY) console.error('Set AESTHETICBOARD_QWEN_API_KEY or DASHSCOPE_API_KEY before running this check.');
    process.exit(1);
  }
  assert.ok(result.candidates?.length, 'Qwen should return at least one keyword candidate');
  console.log(JSON.stringify({ ok: true, provider: result.provider, candidates: result.candidates.map((candidate) => ({ text: candidate.text, dimension: candidate.dimension, confidence: candidate.confidence })) }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || 'QWEN_SMOKE_CHECK_FAILED' }, null, 2));
  process.exit(1);
});
