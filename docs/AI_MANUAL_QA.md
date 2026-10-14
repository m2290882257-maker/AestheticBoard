# AI Manual QA Checklist

Use this checklist before adding more providers or packaging. It separates no-network checks from checks that require a real Qwen API key.

## No Real API Required

1. Open More and confirm AI Keywords is visible near the top.
2. Confirm the provider starts as Off / local or Local mock; no external AI should run by default.
3. Open Data & Privacy and confirm AI Privacy explains provider, model, prompt, image access, text access, network access, and key status without showing any secret value.
4. Confirm GPT-5.7 Luna appears only as future/not connected in the provider list and has no enable button.
5. Generate local/mock suggestions in browser preview if desktop provider is unavailable; suggestions should remain candidates until accepted.
6. Dismiss one candidate and confirm it stays out of Search.
7. Accept one candidate, wait for Saved, then confirm Search can find it.
8. Pin an accepted keyword from the accepted keyword row; pin should not exist as a candidate-row action.
9. Cancel a pending local AI job when visible; canceled jobs should not auto-restart after reload.
10. Export JSON/backup and confirm no API key value appears.

## Real Qwen API Required

1. Start desktop from the PowerShell session where `AESTHETICBOARD_QWEN_API_KEY` or `DASHSCOPE_API_KEY` is set.
2. Open More -> AI Keywords and click Enable Qwen.
3. Open Data & Privacy and confirm Qwen key says Available, model is the expected DashScope model id, and prompt version is visible.
4. Click Test connection. This is text-only and should not upload a board image.
5. Add or select one Durable image.
6. Click Suggest on that image and confirm candidates appear in the same review UI.
7. Click Retry AI after a forced provider failure; retry should reuse the same image and not create duplicate board objects.
8. Click Generate day with several Durable images that do not already have accepted keywords.
9. Watch batch progress in More and on the currently processed image.
10. Click Stop day AI and confirm completed candidates remain while unfinished work stops.
11. Accept, dismiss, and pin suggestions; then verify Search only finds accepted/pinned terms.
12. Turn AI off from More and confirm new external jobs stop while approved keywords remain.

## Demo Script For Review

1. Show that AI is off by default in More.
2. Enable Qwen and point out key/model/prompt status in Data & Privacy.
3. Run Test connection without uploading a board image.
4. Select one Durable image and generate suggestions.
5. Accept one keyword, dismiss another, and pin the accepted one.
6. Search for the accepted term and then for the dismissed term to show the trust boundary.
7. Start Generate day, show progress, then stop it.
8. Turn AI off and confirm the board content remains unchanged.

Never paste or screen-share the actual API key during QA.
