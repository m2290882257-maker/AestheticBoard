# AI Provider Setup

> Current state: Qwen3.7 Flash is the first real provider path. GPT-5.7 Luna is registered only as a disabled placeholder and cannot call a real API yet.

## Where To Put Sensitive Values

Do not put API keys in renderer code, project source files, exported JSON, or Profile backup files.

For local desktop testing, set the key in the PowerShell session before starting Electron:

```powershell
$env:AESTHETICBOARD_AI_PROVIDER = "qwen3.7-flash"
$env:AESTHETICBOARD_EXTERNAL_AI_ENABLED = "1"
$env:AESTHETICBOARD_QWEN_API_KEY = "your-qwen-or-dashscope-api-key"
cmd /c npm start
```

You can also run a text-only smoke check from the same PowerShell session:

```powershell
npm run check:provider:qwen
```

The connector also accepts `DASHSCOPE_API_KEY` as a fallback if `AESTHETICBOARD_QWEN_API_KEY` is not set.

Optional non-secret settings:

```powershell
$env:AESTHETICBOARD_QWEN_MODEL = "qwen3.7-flash"
$env:AESTHETICBOARD_QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:AESTHETICBOARD_QWEN_TIMEOUT_MS = "60000"
```

## Profile Config Alternative

Non-secret provider settings may also be edited in:

`%LOCALAPPDATA%\AestheticBoard\profile-v1\keyword-provider-config.json`

Example:

```json
{
  "schemaVersion": 1,
  "activeProvider": "qwen3.7-flash",
  "consentVersion": "provider-consent-v1",
  "externalProviderEnabled": true,
  "allowImageAccess": true,
  "allowTextAccess": true,
  "allowNetwork": true,
  "providerOptions": {
    "qwen3.7-flash": {
      "model": "qwen3.7-flash",
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "timeoutMs": 60000
    }
  }
}
```

Keep the API key in an environment variable even when using this file.

## What Gets Sent

When Qwen is enabled, the desktop main process sends the working image derivative as an image data URL plus limited object context: source type, current pinned keywords, and note text. Absolute local file paths are not sent.

## Expected Failure States

- Missing API key -> `AI_MISSING_API_KEY`
- Disabled provider -> `AI_PROVIDER_DISABLED`
- Missing opt-in -> `AI_PROVIDER_REQUIRES_OPT_IN`
- Missing durable/working image -> `AI_IMAGE_NOT_DURABLE` or `AI_WORKING_DERIVATIVE_MISSING`
- Timeout -> `AI_PROVIDER_TIMEOUT`
- Rate limit -> `AI_PROVIDER_RATE_LIMITED`
- Bad provider output -> `AI_PROVIDER_SCHEMA_INVALID`

These errors stay local to the affected image keyword panel.

## In-App Test Steps

1. Start the desktop app from the same PowerShell session where the API key is set.
2. Open More -> Data & Privacy.
3. In AI Privacy, click Enable Qwen.
4. Click Test connection. This sends a text-only provider test and does not upload board images.
5. Add or select a Durable image on the day canvas.
6. Open that image keyword panel and click Suggest. This is the first real image keyword request.
7. Review candidates with Accept, Pin, Dismiss, or Regenerate. Candidates do not become searchable pinned keywords until accepted or pinned and saved.

If Test connection reports `AI_MISSING_API_KEY`, the desktop app was not launched from the shell where the key was set.

## Runtime Prompt

Qwen keyword generation reads the runtime prompt from `docs/QWEN_KEYWORD_PROMPT.md`. The connector sends the document's System Prompt as the API system message and the User Prompt with the working image derivative as the user message. Keep API keys out of this prompt file.

## Automatic Keyword Mode

Automatic keyword generation is off by default. After Qwen is enabled, Data & Privacy -> AI Privacy exposes an Auto keywords control. Turning it on starts keyword generation for eligible Durable images on the active day and for newly added images after capture/localization succeeds. The setting is session-only: leaving or hiding the window turns automatic generation off, while saved keyword candidates remain on the board through the normal ACK-backed keyword mutation path.


## Confirming The Actual Qwen Model

The model actually sent to DashScope is the effective Qwen model shown in Data & Privacy -> AI Privacy.

Current default:

```text
qwen3.7-flash
```

Where it comes from, in priority order:

1. `AESTHETICBOARD_QWEN_MODEL` environment variable for development overrides.
2. `providerOptions["qwen3.7-flash"].model` in the local Profile provider config.
3. The built-in default `qwen3.7-flash`.

The diagnostics row also shows whether the desktop main process can see a Qwen API key, but it never displays or returns the key value.

If the DashScope console uses a different deployed model id, set it before launching desktop:

```powershell
$env:AESTHETICBOARD_QWEN_MODEL = "your-dashscope-model-id"
cmd /c npm start
```

## Prompt File Checklist

Before changing `docs/QWEN_KEYWORD_PROMPT.md`:

1. Keep a visible version near the top, for example `**Version:** 1.1` or `promptVersion: qwen-visual-keywords-v1.1`.
2. Keep separate `## 2. System Prompt` and `## 3. User Prompt` fenced blocks so the connector can load them safely.
3. Keep the expected output as JSON keyword objects with English search terms first.
4. Do not put API keys, absolute local file paths, or private project notes in the prompt file.
5. After editing, open Data & Privacy -> AI Privacy and confirm Provider, Model, and Prompt version match what you expect.

## Troubleshooting Map

- Missing key: `AI_MISSING_API_KEY` means the desktop main process cannot see `AESTHETICBOARD_QWEN_API_KEY` or `DASHSCOPE_API_KEY`. Start Electron from the PowerShell session where the key is set.
- API key rejected: `AI_PROVIDER_AUTH_FAILED` means DashScope rejected the key. Check whether the key is correct, active, and allowed for the selected model.
- Model not found: `AI_PROVIDER_MODEL_NOT_FOUND` means DashScope did not accept the configured model name. Check `AESTHETICBOARD_QWEN_MODEL` or `keyword-provider-config.json`.
- Timeout: `AI_PROVIDER_TIMEOUT` means the provider took too long. Retry later, reduce batch size, or increase `AESTHETICBOARD_QWEN_TIMEOUT_MS` for development testing.
- Rate limit: `AI_PROVIDER_RATE_LIMITED` means requests are arriving too quickly. Wait before retrying or stop the current-day batch.
- Output format failure: `AI_PROVIDER_SCHEMA_INVALID` means the provider answered, but not in the keyword JSON shape required by `docs/QWEN_KEYWORD_PROMPT.md`.
- Working image missing: `AI_WORKING_DERIVATIVE_MISSING` means the local working copy could not be found. Repair media or re-add the image before retrying.
- Interrupted job: `AI_JOB_INTERRUPTED` means the app closed or reloaded while an AI job was queued/sending/waiting. Retry uses the existing image/job context instead of making a duplicate object.

## API Key Handling Decision

Current decision for development: keep Qwen API keys in environment variables only.

The renderer and UI may show this safe status shape:

```json
{
  "providerId": "qwen3.7-flash",
  "available": true,
  "source": "AESTHETICBOARD_QWEN_API_KEY",
  "secretVisibleToRenderer": false
}
```

The renderer must never receive the secret value. Do not store API keys in source files, Profile JSON, exported JSON, backups, logs, screenshots, or Markdown docs.

A desktop credential store should be added later before packaging or wider testing. That later UI can replace manual environment-variable setup without changing the Qwen connector contract.

## Manual QA And Future Providers

Use `docs/AI_MANUAL_QA.md` for the repeatable AI review checklist. The checklist separates no-network checks from real-Qwen checks that require an API key.

GPT-5.7 Luna is intentionally visible only as a future placeholder. It is not connected, has no API-key path, cannot become the active provider through local config, and cannot make network requests in this build.

## Qwen API Key Storage

Development fallback still works through PowerShell environment variables:

- AESTHETICBOARD_QWEN_API_KEY
- DASHSCOPE_API_KEY

Desktop storage now has a safer first-pass path:

1. Put the Qwen key in a small local .txt, .key, or .env file.
2. Open Data & Privacy -> AI Privacy -> Save Qwen key.
3. The Electron main process reads the file and stores the key through safeStorage.
4. The renderer only receives status such as Saved, Missing, or Available. It never receives the key value.
5. Clear saved key removes only the app-saved secure-storage key. Environment variables, if present, remain outside the app.

Priority order:

1. Secure storage key saved by the app.
2. AESTHETICBOARD_QWEN_API_KEY environment variable.
3. DASHSCOPE_API_KEY environment variable.
4. Missing key.

Do not commit API keys, paste them into source files, or include them in screenshots/logs/docs.
