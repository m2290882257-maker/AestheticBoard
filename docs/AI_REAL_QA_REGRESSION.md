# Real AI QA Regression Pack

This checklist is for manual Qwen testing from the desktop app. Do not paste or screenshot the real API key in issues, exports, backups, or docs.

## Before Testing

- Start the desktop app normally.
- Open More and confirm AI Keywords shows the current status clearly.
- If the key was saved through Data & Privacy, More should show Key as Saved.
- If using development env vars, More should show Key as Available.
- Data & Privacy -> AI Privacy should show provider, model, prompt version, key source, image access, text access, and network access.

## No-Network Regression

These are covered by npm run check and should not make real provider calls:

- Local mock remains the default/offline provider.
- GPT-5.7 Luna remains future-only and cannot run.
- Renderer-safe diagnostics never expose the API key value.
- Malformed provider output is rejected before becoming trusted keywords.
- Suggested/dismissed candidates are excluded from search.
- Accepted candidates enter search only after save ACK.

## Real Qwen Smoke Test

Requires a valid Qwen API key, but never requires showing the key.

1. Open More -> Enable Qwen.
2. Click Test connection. It should succeed without uploading a board image.
3. Select one Durable image and click Suggest.
4. Confirm candidate keywords appear in the same review UI as local mock.
5. Hover a long candidate to read it fully.
6. Accept one candidate, dismiss one candidate, and pin one accepted keyword.
7. Search the accepted/pinned keyword after Saved appears.
8. Confirm unreviewed and dismissed candidates do not appear in trusted search.

## Auto Keywords

1. Enable Qwen, then turn on Auto keywords from More.
2. Drop a new image.
3. While the image is still saving, the object should show Waiting for image save.
4. When the image becomes Durable, AI should automatically generate suggestions.
5. Leave or hide the window, then return. Auto should be Off, while existing suggestions remain.

## Generate Day

1. Prepare several Durable images with no accepted keywords and no unreviewed suggestions.
2. Click Generate day.
3. Confirm one image is processed at a time and the current image owns its own state.
4. Click Stop day AI.
5. Completed suggestions should remain; not-yet-started images should stop.
6. Run Generate day again. Images with existing unreviewed suggestions should not duplicate candidates.

## Failure And Recovery

- Missing key should say Add Qwen API key.
- Bad key should say API key was rejected.
- Wrong model should say Qwen model not found.
- Timeout should say Provider timeout.
- Rate limit should say Rate limited.
- Bad JSON/output shape should say Provider output format failed.
- Restart during queued/sending/waiting should restore as AI was interrupted, with Retry AI available on the affected image.
