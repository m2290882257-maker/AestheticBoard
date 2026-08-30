# AestheticBoard Project Status

> Last updated: 2026-08-30
> Current local branch: pr/slices-15-17
> Latest PR: https://github.com/m2290882257-maker/AestheticBoard/pull/2

## Current Implementation State

AestheticBoard has moved from a static vertical-slice prototype into a desktop-capable capture board with local profile persistence, recoverable media capture, SQLite-backed search, local export/import, durable retry metadata, full-day export, hardened remote capture policy, backup/restore UX, local-first AI keyword review, provider opt-in boundaries, keyword conflict detail, object-local and batch imported media repair, disabled external-provider consent surfaces, polished Day / Weekly / Monthly navigation surfaces, a no-API real-provider connector scaffold behind the keyword gateway, the first Qwen real-provider adapter path with secrets kept outside renderer/source files, prompt-versioned AI output quality guards, and a current-day batch AI suggestion action.

Implemented slices:

| Slice | Status | Notes |
| --- | --- | --- |
| 01 | Done | Board shell, editable title, action bar, temporal controls, canvas, image object, keyword layer, quick note. |
| 02 | Done | Wheel zoom, reset view, zoom percent display. |
| 03 | Done | Image corner resize using pointer handles. |
| 04 | Done | Canvas pan through pointer flow. |
| 05 | Done | Clipboard image paste into canvas. |
| 06 | Done | Browser/file drag capture into canvas. |
| 07 | Done | Day-based local state model with temporal navigation. |
| 08 | Done | Electron desktop shell, window restore, always-on-top control. |
| 09 | Done | Background surface picker and Profile visibility in More menu. |
| 10 | Done | Dense board behavior, keyboard controls, responsive and accessibility polish. |
| 11 | Done | Drag Harness diagnostics for desktop/browser drag payloads. |
| 12 | Done | Local Profile v1 scaffold under LocalAppData. |
| 13 | Done | SQLite metadata migration scaffold and profile schema. |
| 14 | Done | Atomic original media commit for local image captures and app-media asset loading. |
| 15 | Done | Persistence Worker queue with revision ACK. |
| 16 | Done | Restart recovery for day, camera, objects, lock, note, keyword state, and trash. |
| 17 | Done | Per-image capture lifecycle UI: Resolving, Localizing, Durable, Failed. |
| 18 | Done | Typed mutation envelopes at the preload/main boundary. |
| 19 | Done | Capture jobs are persisted as recoverable queue records. |
| 20 | Done | Media assets track original, working, and thumbnail variants. |
| 21 | Done | Failed captures have object-local Retry, Keep Reference, and Remove actions. |
| 22 | Done | Search covers days, titles, keywords, notes, links, hosts, dates, and source types. |
| 23 | Done | Download / Share exports JSON and viewport PNG with Save As on desktop. |
| 24 | Done | Failed mutation ACKs stay in retry queue with object-level repair actions. |
| 25 | Done | Restore harness exports sanitized fixtures and read-only verification summaries. |
| 26 | Done | Remote image URLs localize through capture job/media derivative pipeline. |
| 27 | Done | SQLite-backed search index can rebuild from snapshots and query from renderer. |
| 28 | Done | Desktop import previews JSON and safely imports as a new day. |
| 29 | Done | Failed mutation retry metadata survives restart. |
| 30 | Done | Full-day PNG export fits all current-day objects without mutating camera. |
| 31 | Done | Remote URL localization blocks unsafe hosts/schemes with clearer errors. |
| 32 | Done | Export and remote policy helpers split into small Electron modules. |
| 33 | Done | Data & Privacy contains Backup / Restore with safe export, preview, import, fixture, and verification. |
| 34 | Done | Local automated checks cover Profile recovery, retry metadata, export guards, and remote policy. |
| 35 | Done | Provider-neutral AI keyword gateway with local mock generation only. |
| 36 | Done | Object-level AI keyword candidate review with Accept, Pin, Dismiss, and Regenerate. |
| 37 | Done | Import preview compares media ids and SHA-256 against local media index. |
| 38 | Done | Data & Privacy exposes local mock AI provider and disabled external provider state. |
| 39 | Done | Keyword candidates keep id, provider/source, confidence, review state, and timestamps through ACK/restart/backup/import. |
| 40 | Done | Import preview shows title, object count, trash count, matched/missing/unsupported media, and ignored fields. |
| 41 | Done | Keyword provider registry defines capabilities and rejects external provider requests without future opt-in. |
| 42 | Done | Imported missing media stays visible with object-local Relink file / Keep ref actions and SHA-256 validation. |
| 43 | Done | Keyword candidate save conflicts now show object-local detail with Retry keywords / Keep visible actions and candidate-level dedupe. |
| 44 | Done | Data & Privacy can scan a chosen folder, preview SHA-256 media matches, and apply confirmed batch relinks. |
| 45 | Done | Provider capability/consent copy is visible while external provider settings remain disabled and unenforceable by mutation. |

## Current Progress Sync - 2026-08-30 Evening

The product is now past the core local-first board foundation and has entered the concrete AI keyword introduction stage.

Completed or updated since the last status sync:

- Day / Weekly / Monthly views now share the same navigation stack. Day opens the spatial canvas, Weekly opens seven date cards, and Monthly opens the month calendar; clicking a weekly or monthly date jumps back into that date's Day Canvas.
- The right-side controls have been polished: date navigation uses the compact arrow / TODAY / arrow style, Day / Weekly / Monthly uses the segmented mode selector, and Reset View sits below the mode selector with matching spacing.
- The left subtitle under the title now reflects the current mode: full date in Day mode, week range in Weekly mode, and month/year in Monthly mode.
- More, Data & Privacy, Download / Share, Trash, and Search have been cleaned so they feel more like product surfaces and less like debug panels. Data & Privacy can scroll when content is tall, and middle-mouse canvas pan no longer fights with open panels.
- Data & Privacy now owns local profile, backup/restore, media repair, AI privacy, and maintenance details. The duplicate standalone Profile panel has been removed.
- Quick Note typing and font mapping have been repaired so notes use the intended handwriting-style note fonts instead of falling back to a generic UI font.
- New image objects no longer receive fake default keyword placeholders. Real keywords now come from user actions or AI suggestions only.
- Keyword hover and pin behavior has been refined: selected keywords show a hover tooltip with the full keyword, suggestion rows now only offer Accept and Dismiss, and pinning happens from the accepted keyword row's pin icon before the copy icon.
- Qwen real-provider path is connected behind the existing keyword gateway. The renderer still never receives the API key; Electron main reads it from environment variables. GPT-5.7 Luna remains a disabled placeholder.
- Qwen keyword generation now loads the runtime prompt from `docs/QWEN_KEYWORD_PROMPT.md` and sends the working image derivative plus limited object context through the existing provider connector.
- Automatic AI keyword mode is available but off by default. It is session-only: leaving or hiding the window turns it off, while generated candidate keywords already saved on the board remain.
- AI keyword output is now prompt-versioned and quality-guarded: empty output, malformed candidate shapes, unusable keyword text, timeout, and rate-limit failures remain object-local failures instead of becoming trusted keywords.
- Data & Privacy now includes a current-day Generate day / Stop day AI control for batch suggestions across eligible Durable images. It queues only images without accepted/pinned keywords and throttles requests between images.
- AI controls have been lifted from Data & Privacy into the More panel, so Qwen enable/off, Test connection, Auto keywords, and Generate day are one level closer to the user. Data & Privacy now keeps the privacy/model/prompt/access explanation without repeating the same controls.

Plain-language current state:

AestheticBoard can now be used as a local visual inspiration board with day/week/month browsing, reliable local persistence, import/export/backup tools, media repair paths, and a first real AI keyword provider route. The AI route is intentionally gated: users must explicitly enable Qwen and provide a key outside source code before any external keyword request can happen.

## 大白话 Slice 注释

| Slice | 这一步是干嘛的 | 对产品有什么用 | 怎么简单测试 | 不做会怎样 |
| --- | --- | --- | --- | --- |
| 22 | 增加搜索，能找日期标题、关键词、备注、链接、来源类型等。 | 灵感板变多后还能找回旧内容。 | 按 Ctrl/Cmd+F 搜备注或关键词，点击结果看镜头跳过去。 | 旧素材只能靠肉眼翻找。 |
| 23 | Download / Share 可以导出 JSON 和桌面端 PNG，并让用户选择保存位置。 | 有第一版本地备份和分享能力。 | 点导出 JSON/PNG，选择文件夹，确认文件生成。 | 内容只能留在 app 里，无法备份或给别人看。 |
| 24 | 保存失败会进入重试队列，并在对象上显示 Retry save / Keep。 | 保存失败不再悄悄消失，也不会强行撤销用户刚做的视觉调整。 | 触发或模拟失败后，确认对象仍可见，并能重试。 | 用户会以为操作成功，或者被突然回滚。 |
| 25 | 加恢复测试夹具和只读验证。 | 开发者可以反复测试恢复路径，不用手动改用户文件。 | 导出 restore fixture，再跑 Profile verification，看报告。 | 恢复能力只能靠人工试，容易漏问题。 |
| 26 | 远程图片 URL 先作为引用出现，再后台尝试本地化。 | 网页图片不会阻塞拖拽，成功后也能变成本地耐久媒体。 | 拖一个远程图片 URL，确认先出现，再变 Durable 或局部 Failed。 | 远程图片只是脆弱链接，源站变化后可能失效。 |
| 27 | 把搜索索引搬到 SQLite，重启后也能查历史内容。 | 搜索不再只靠页面临时重建，桌面端更可靠。 | 重启桌面端后搜索旧备注/关键词，确认还能找到。 | 一刷新或重启，历史搜索可能慢或不完整。 |
| 28 | 让导出的 JSON 可以被安全预览并导入成新的一天。 | 后续备份、恢复、导入测试有了入口。 | 导出 JSON，再 Preview，再 Import as new day，确认原日期不被覆盖。 | 导出文件只能看，不能验证恢复。 |
| 29 | 保存失败队列也写进本地 Profile。 | 失败状态重启后还在，用户可以继续处理。 | 模拟失败后重启，看 Retry save 是否还在。 | 重启会把失败痕迹冲掉，用户不知道哪些操作没保存。 |
| 30 | 可以导出整天画布，而不只是当前屏幕。 | 大画布也能完整分享和备份成图片。 | 把对象放到屏幕外，点 Export full-day PNG，看导出图包含所有对象。 | 只能截当前视口，远处内容会漏掉。 |
| 31 | 给远程 URL 抓图加安全边界。 | 防止应用去抓本机、内网或过大的危险资源。 | 拖 localhost/内网链接应保持引用或失败；普通公网图片仍可尝试本地化。 | 远程抓图可能触碰本地/内网风险，也更难解释失败原因。 |
| 32 | 把部分大文件逻辑拆成小模块。 | 后续功能不用都挤在一个超大文件里。 | 跑检查，确认拆分后界面行为不变。 | 越做越难维护，改一个地方容易碰坏另一块。 |
| 33 | 把备份/恢复集中放进 Data & Privacy。 | 用户知道去哪里备份，也知道恢复默认不会覆盖。 | 打开 More -> Data and privacy，看 Backup / Restore 区域。 | 备份入口藏在 Download 里，用户容易找不到。 |
| 34 | 给恢复、导出、安全策略加自动检查。 | 每次改功能都能快速发现基础能力坏没坏。 | 跑项目检查，看到 Slice 34 等检查通过。 | 只能靠手点，越往后越容易漏回归。 |
| 35 | 先做 AI 关键词的本地网关，不接真实云服务。 | 让 UI 和数据结构先跑起来，同时不碰隐私风险。 | 点生成建议，确认候选词出现且没有外部 API。 | 后面接 AI 时会直接混进业务逻辑，隐私边界不清。 |
| 36 | 用户可以审 AI 建议：接受、Pin、驳回、重新生成。 | AI 只提供建议，最终关键词还是用户说了算。 | 对一张图生成建议，试 Accept/Pin/Dismiss/Regenerate。 | AI 建议可能静默变成正式关键词，用户会失去控制感。 |
| 37 | 导入前检查备份里的图片本地能不能匹配。 | 已有图片能复用，缺失图片不阻塞备注和位置恢复。 | 用备份导入预览，看 matched/missing/unsupported 数字。 | 导入时不知道哪些图能恢复，可能重复存图或误以为全失败。 |
| 38 | 明确 AI provider 现在只是本地 mock，外部 provider 默认关闭。 | 用户知道没有偷偷联网，也为未来开关留位置。 | More -> Data and privacy 查看 AI provider 状态。 | AI 能力边界不透明，未来接 provider 容易误触云请求。 |
| 39 | 把 AI 关键词候选的身份、来源、置信度、接受/驳回状态和时间都保存清楚。 | 用户审过的建议不会因为重启、导出、导入或保存重试而变糊。 | 生成候选词，接受一个、驳回一个，重启后看状态还在；搜索只能搜到已接受/已 Pin 的词。 | 候选词像临时草稿，重启或导入后可能丢状态，也可能把驳回词错误纳入搜索。 |
| 40 | 导入前给用户看一张小清单：标题、对象数、垃圾桶数、媒体匹配/缺失/不支持。 | 用户在点导入前能知道风险，不会盲目把文件塞进画布。 | 点 Preview import JSON，看清单出现；不导入时画布不变；再点 Import as new day，看它作为新日期进入。 | 用户不知道导入会带来什么，缺图或不支持字段只能事后才发现。 |
| 41 | 给未来真实 AI provider 先装一个总闸门。 | 以后接云端 AI 前，产品已经知道哪个 provider 会读图、读文字、联网、是否需要同意。 | 打开 Data & Privacy 看 provider 能力；检查外部 provider 请求默认被拒绝。 | 未来一接 AI 就容易偷偷越过隐私边界，用户也看不懂数据会去哪。 |
| 42 | 导入后如果图片缺失，原位置会保留，并允许用户手动选择本地原图修复。 | 备份恢复更实用，缺图不会让整个画布坏掉。 | 导入一个缺媒体的备份，看 Missing media；点 Relink file 选匹配图片，成功后对象变回 Durable。 | 缺失图片只能一直坏着，或者用户被迫重新摆图、重写备注和关键词。 |

## Verified Behaviors

- `npm run check` passes through renderer, server, Electron main/preload, persistence, media-store, mutation, export, remote policy, keyword gateway, import media, and recovery checks.
- The automated recovery script now reports `Slice 34/35/36/37/38/39/40/41/42/43/44/45/PackageD/AI Package 1B/Package 2/AI Task 3/AI Task 4/AI Task 5/AI Task 6/AI Task 8/AI Task 9/AI Task 10 checks passed`.
- External AI provider requests are rejected by the keyword gateway unless a future explicit opt-in exists.
- Missing imported media can stay visible as a local object with Relink file / Keep ref actions.
- Relink validates SHA-256 when available and commits matched files into the same durable media pipeline as local captures.
- Import, export, search, retry, and backup flows remain local-only and non-destructive by default.

## Workspace Hygiene - 2026-08-30

Current cleanup rule before continuing AI development:

- Canonical product/design/engineering docs now live under `docs/`; the old root-level Markdown copies are treated as moved/de-duplicated, not as files to restore.
- `PROJECT_STATUS.md` stays at the project root as the active progress ledger.
- `不上传_开发文档/` is local source-discussion material and is ignored by Git so it does not enter PRs or distract status checks.
- Temporary edit scripts matching `tmp-*.cjs` are ignored and should not remain in the workspace after edits.
- `启动powershell帮助.md` has been repaired as clean UTF-8 Chinese and now documents normal launch, Qwen launch, provider smoke check, and the canonical docs location.
- Local Git display is configured with `core.quotePath=false` so Chinese file names appear as readable Chinese instead of escaped byte sequences.

Quick verification:

- `cmd /c npm run check` should still pass after hygiene edits.
- `git status --short` should no longer show `不上传_开发文档/` as untracked noise.

## Current Architecture Reality

- Renderer is still mostly plain `app.js`; Slice 32 started helper extraction but more module split is still needed.
- Persistence Worker is currently a main-process queue class, not a separate worker thread.
- SQLite uses `node:sqlite` when available and falls back to JSON snapshot persistence when unavailable.
- Profile snapshot is stored as `workspace-snapshot.json`; mutation batches append to `logs/mutation-log.jsonl` and mirror into SQLite where possible.
- Local, remote-localized, and relinked images render through `app-media://asset/<assetId>?variant=working` with original fallback.
- Search is SQLite-backed in desktop, with renderer search as browser preview fallback.
- Qwen3.7 Flash is the first real-provider adapter path and stays off until local opt-in plus an API key are provided. It now loads `docs/QWEN_KEYWORD_PROMPT.md` as the runtime system/user prompt for real image keyword generation. AI candidates and jobs carry promptVersion, and bad provider output is rejected as local AI failure. GPT-5.7 Luna remains a disabled placeholder. Local mock remains the default runnable provider.

## Known Technical Debt

- Continue moving the codebase toward clearer main / preload / renderer / persistence / media / domain boundaries.
- Add a real SQLite driver strategy for packaged Electron if `node:sqlite` remains unstable.
- Add Git LFS or another asset strategy for large font/media files, especially `refer/fonts/系统手写/PingFang.ttc`.
- Add Playwright/Electron automated checks for actual window restart and drag capture where feasible.
- Decide whether runtime UI labels remain English or need localized Chinese variants.

## Newly Completed Slices

### Slice 43: Keyword Candidate Conflict Detail

- Keyword save failures now get a compact object-local detail panel inside the keyword area.
- The panel shows affected keyword mutation types and offers Retry keywords / Keep visible.
- Retry entries are deduped by mutation type plus candidate or keyword identity before display.
- Search remains tied to ACKed durable state; dismissed/unACKed candidates are not added to the durable search index.

### Slice 44: Backup Import Media Relink Batch

- Data & Privacy now shows a missing-media repair summary for the current day.
- Users can scan a chosen folder for missing imported media by SHA-256.
- The scan returns a preview with scanned, matched, unmatched, and folder name before anything is applied.
- Apply matched media commits only confirmed matches through the same durable media pipeline and saves media.relink mutations.

### Slice 45: Provider Consent Copy And Disabled Settings

- Data & Privacy now exposes provider capability details: local/external, image access, text access, network requirement, and disabled state.
- External provider requests are rejected by the gateway by default.
- Even a future-looking opt-in flag cannot enable the disabled external placeholder yet.
- Local mock keyword generation remains unchanged.

### Package B: Product UX Completion Cleanup

- More is now a lightweight entry panel: Search, Retry failed saves, Always-on-top, Drag Harness, and Data & Privacy.
- Data & Privacy is grouped into Local Data, Backup / Restore, Media Repair, AI Privacy, and Maintenance.
- Download / Share now focuses only on export actions: day JSON, viewport PNG, and full-day PNG.
- Search and Trash copy was simplified so user-facing surfaces no longer expose implementation details like SQLite source labels.

### Package D: Optional AI Provider Boundary

- Added a local keyword provider config shape with active provider, consent version, image/text/network permissions, and updated timestamp.
- Keyword generation now goes through a provider router instead of calling the mock path directly.
- Local mock remains the only runnable provider; external provider requests are rejected even if a future-looking opt-in flag is passed.
- Data & Privacy now shows provider consent version and access permissions so users can see that image access and network access are off.
- Automated checks now cover provider config defaults, disabled external provider enforcement, and local mock routing.

### Post-Slice 45 Navigation And Overview Polish

- Day / Weekly / Monthly is now a segmented mode selector instead of a disabled dropdown.
- Weekly view shows seven day cards for the active week and each card opens its matching Day Canvas.
- Monthly view shows the active month calendar and each date cell opens its matching Day Canvas.
- Previous / Today / Next keeps mode-aware behavior: day steps by one day, weekly steps by one week, monthly steps by one month.
- Date navigator, mode selector, and Reset View now use a tighter right-side control stack.

### AI Package 1: Real Provider Connector Scaffold - No Real API

- Added a main-process provider connector module behind the existing keyword gateway.
- Local mock still runs exactly as before and remains the default provider.
- External provider jobs now have a formal job shape, durable-image checks, working-derivative checks, unified AI_PROVIDER error codes, and response schema validation.
- This scaffold has now been extended by AI Package 1B so Qwen3.7 Flash can become the first real provider after explicit local opt-in and API key setup.
- GPT-5.7 Luna remains a registered but disabled placeholder and cannot make network/API requests.
- Automated checks cover disabled external provider enforcement, Qwen config sanitization, non-durable image rejection, response validation, candidate dedupe, and confidence clamping.

## Manual Test Checklist

> Current note: most of this checklist has already been manually tested by the product owner and is considered passing for the current development stage. Keep it here as the lightweight baseline for later QA, packaging, and release prep. Do not expand Package A/C work until the main panels are complete.

### Core Board

- Launch the browser preview or desktop app and confirm the main day canvas appears.
- Use mouse wheel to zoom in and out; use Reset View to restore the view.
- Hold middle mouse button and pan the board, including while a popover is open.
- Drag image objects around the canvas and confirm they stay where placed.
- Resize an image from the corner handle and confirm the size remains stable.
- Lock and unlock an object and confirm locked objects do not move accidentally.

### Capture And Objects

- Paste an image from clipboard and confirm it appears on the current day.
- Drag in a local image file and confirm it becomes a board image.
- Drag in a normal web link and confirm it becomes a link object.
- Drag in a remote image URL and confirm it first appears, then either localizes or shows a local failure state.
- Add or edit a quick note on an object.
- Add, pin, copy, accept, dismiss, or regenerate keywords where available.

### Navigation And Recovery

- In Day mode, use Previous, Today, and Next and confirm each click changes exactly one day.
- Switch to Weekly, confirm the subtitle reads like `Week of Aug 24 -Aug 30 , 2026`, then use Previous/Next and confirm each click changes one week.
- Click any Weekly day card and confirm it opens that date's Day Canvas.
- Switch to Monthly, confirm the subtitle reads like `August, 2026`, then use Previous/Next and confirm each click changes one month.
- Click any Monthly date cell and confirm it opens that date's Day Canvas.
- Move objects, edit notes/keywords, switch day, then return and confirm the day state is preserved.
- Restart the desktop app and confirm active day, camera, object positions, sizes, z-order, lock state, notes, keywords, and trash state recover.

### Panels

- Open More and confirm it stays lightweight: Search, Retry failed saves, Always-on-top, Drag Harness, and Data & Privacy.
- Open Data & Privacy and confirm it contains Local Data, Backup / Restore, Media Repair, AI Privacy, and Maintenance.
- Scroll long Data & Privacy content with the mouse wheel.
- Open Download / Share and confirm it only contains export actions.
- Open Search with Ctrl/Cmd+F, search a note/keyword/link, and confirm results highlight or jump without moving objects.
- Open Trash and confirm discarded items can be restored, deleted, or cleared.

### Export, Import, And Repair

- Export day JSON and confirm a save location can be chosen on desktop.
- Export viewport PNG and full-day PNG where desktop capture is available.
- Preview restore JSON and confirm the preview is read-only.
- Import as new day and confirm existing days are not overwritten.
- For missing imported media, use Relink file or folder scan and confirm layout, notes, keywords, lock state, and z-order remain unchanged.

### Privacy And Failure Boundaries

- Confirm external AI is off by default; Qwen can run only after explicit Enable Qwen plus a valid environment API key.
- Confirm local mock keyword generation does not make a cloud/API request.
- Confirm unsafe remote URL targets stay blocked or become references instead of being fetched.
- Confirm failed saves or capture failures stay local to the affected object/control and do not open a global modal.

## AI Task 1 / 2 Progress - 2026-08-30

### AI Task 1: Confirm And Lock The Qwen Model

Status: Done for implementation, pending product-owner confirmation against the DashScope console model id.

What changed:

- Data & Privacy -> AI Privacy now shows the effective Qwen model, model source, Qwen key availability, key source, endpoint, and timeout.
- The diagnostics path is read-only and never returns the API key value.
- `AESTHETICBOARD_QWEN_MODEL` remains the highest-priority development override, followed by Profile provider config, then the built-in default `qwen3.7-flash`.
- The same effective model value is used by the real Qwen request path and the diagnostics display.
- `docs/AI_PROVIDER_SETUP.md` now documents where to confirm or override the actual Qwen model id.

Plain-language value: the app now tells you what model it is actually about to call, instead of asking you to trust a label in the UI.

### AI Task 2: Real Qwen Keyword Verification Pass

Status: Partially complete.

What changed:

- Test connection now returns diagnostics together with the provider result.
- Common Qwen provider failures still map into local object/provider states and do not become trusted keywords.
- Full project checks cover diagnostics, environment override priority, API-key redaction, Qwen URL normalization, disabled GPT-5.7 Luna behavior, and missing-key handling.

Current verification result:

- `npm run check` passes.
- `npm run check:provider:qwen` was attempted from this Codex environment and returned `AI_MISSING_API_KEY`, meaning this process cannot see `AESTHETICBOARD_QWEN_API_KEY` or `DASHSCOPE_API_KEY`.
- The next real verification should be run from the same PowerShell session that launches the desktop app and contains the API key.

Manual test next:

1. Start desktop from the PowerShell session where the key is set.
2. Open More -> Data & Privacy -> AI Privacy.
3. Confirm Effective model shows `qwen3.7-flash` or your exact DashScope deployed model id.
4. Confirm Qwen key shows Available.
5. Click Test connection. This does not upload board images.
6. Select one Durable image and click Suggest to run the first real image keyword request.

## AI Task 3 / 4 Progress - 2026-08-30

### AI Task 3: AI Provider Status Copy And User Controls Polish

Status: Done for first pass.

What changed:

- AI Privacy now explains the current mode in plain product language: local/off versus Qwen enabled.
- The panel shows provider, effective model, image access, text access, network access, auto keyword state, session rule, and AI job counts.
- The off action is clearer: `Turn AI off` switches back to local mock and stops new external jobs while keeping accepted keywords.
- Test connection copy clarifies that it is text-only and does not upload board images.
- GPT-5.7 Luna remains visible only as a disabled future provider in the capability list.

### AI Task 4: Durable AI Job Queue

Status: Done for first pass.

What changed:

- AI jobs are now recorded in board state and persisted through the existing ACK-backed snapshot path.
- Jobs track queued, sending, waiting, succeeded, failed, and canceled states.
- Jobs are deduped by object/media, provider, model, prompt version, and locale so retry does not create duplicate work for the same image.
- Restart recovery restores AI job state and re-marks affected images as pending or failed where appropriate.
- Image keyword panels now expose object-local Retry AI and Cancel actions for failed/pending jobs.
- Accepted/pinned keywords remain separate from unreviewed candidates and search stays tied to accepted/pinned keywords.

Manual test next:

1. Open More -> Data & Privacy -> AI Privacy and confirm the rows read like product status, not raw debug output.
2. Enable Qwen, confirm image/text/network rows switch on, then click Turn AI off and confirm they switch back off.
3. On a Durable image, click Suggest and confirm the local keyword panel shows sending/waiting/failure states locally on that image.
4. If a job fails, use Retry AI; if a job is pending, use Cancel.
5. Restart desktop after a failed AI request and confirm the affected image still shows the failed AI state instead of losing it.

## AI Task 5 / 6 Progress - 2026-08-30

### AI Task 5: Prompt Version And Output Quality Guard

Status: Done for first pass.

What changed:

- AI jobs and candidate keyword sets now carry promptVersion, so future prompt changes can be traced back to generated keywords.
- Provider responses are checked for empty output, unsupported candidate shape, unusable or overlong keyword text, duplicate terms, confidence values, and language fields.
- Duplicate usable terms are deduped and tracked in quality metadata.
- Fully bad output is rejected as an object-local AI failure instead of being saved as trusted keywords.
- Timeout and rate-limit failures remain local AI states and do not block capture, notes, manual keywords, search, export, or board movement.

Manual test:

1. Enable Qwen and select a Durable image.
2. Click Suggest and confirm candidates appear with normal Accept / Dismiss review.
3. If Qwen returns bad output, confirm the image shows a local AI failure and does not add broken keywords.
4. Accept one keyword and confirm search finds it only after it becomes an accepted/pinned keyword.

### AI Task 6: Batch AI Suggestions For Current Day

Status: Done for first pass.

What changed:

- Data & Privacy -> AI Privacy now has Generate day for current-day batch suggestions.
- The batch only queues current-day Durable images that do not already have accepted or pinned keywords.
- Requests run one by one with a short delay between images so Qwen is not spammed.
- Each image keeps its own pending, success, failed, retry, and cancel state.
- Stop day AI stops unfinished work while preserving candidates already generated.

Manual test:

1. Enable Qwen from Data & Privacy.
2. Add several Durable images without keywords to the same day.
3. Click Generate day and confirm images are processed one by one.
4. Click Stop day AI mid-run and confirm unfinished images do not start, while completed candidates remain.

## AI Task 7 / 8 Progress - 2026-08-30

### AI Task 7: Real Qwen Smoke Test From Desktop Session

Status: Code path ready; real API verification still needs the PowerShell/Electron session that can see the user's Qwen key.

What changed / verified:

- The provider diagnostics path now reports Qwen provider id, effective model, endpoint, timeout, key availability, key source, and prompt version without exposing the key value.
- The local smoke command reached the Qwen connector, but this Codex process reported `AI_MISSING_API_KEY`, meaning it cannot see the API key that was set in the user's separate PowerShell session.
- This confirms missing-key failures stay local and do not send any board image.

Manual continuation:

1. In the same PowerShell window where the key is set, run `cmd /c npm start`.
2. Open More -> Data & Privacy -> AI Privacy.
3. Confirm Qwen key says Available, model says the intended DashScope model id, and prompt version is visible.
4. Click Test connection. This should not upload a board image.
5. Select a Durable image and click Suggest. Record whether Qwen returns candidate keywords or whether DashScope rejects the configured model id.

### AI Task 8: Prompt Contract Lock And Visible Version

Status: Done for first pass.

What changed:

- The Qwen connector now reads the version from `docs/QWEN_KEYWORD_PROMPT.md` when the file has `**Version:** ...`, `version: ...`, `promptVersion: ...`, or JSON-style `promptVersion` metadata.
- If the prompt file has no explicit version, the connector falls back to the built-in prompt version instead of crashing.
- Data & Privacy -> AI Privacy now shows Prompt / Prompt version alongside Provider and Model.
- Object-local AI failure details now include the prompt version in the hover detail, so a failed generation can be traced back to the prompt contract.
- `docs/AI_PROVIDER_SETUP.md` now includes a prompt-file checklist.

Manual test checklist:

1. Open Data & Privacy -> AI Privacy and confirm Provider, Model, and Prompt are shown together.
2. Edit only the version line in `docs/QWEN_KEYWORD_PROMPT.md`, restart the app, and confirm the displayed prompt version changes.
3. Trigger an AI failure such as missing key; hover the local failure message and confirm Error / Provider / Prompt details are visible.

## AI Task 9 / 10 Progress - 2026-08-30

### AI Task 9: AI Candidate Review Polish

Status: Done for first pass.

What changed:

- AI candidate rows keep only Accept and Dismiss actions. Pin remains on accepted keyword rows before Copy.
- Long candidate keywords keep the compact row layout but expand on hover so the full phrase can be read.
- Candidate hover details include the full keyword, Chinese translation when present, provider/source, prompt version, and confidence.
- Candidate metadata is shown as a quiet compact detail line, not a large debug block.
- Added Dismiss all for the current image's unreviewed suggestions. It does not remove accepted or pinned keywords.

Manual test checklist:

1. Generate AI suggestions with at least one long keyword.
2. Hover the candidate text and confirm the full keyword can be read.
3. Confirm each candidate row only has Accept and Dismiss.
4. Accept one candidate, then confirm pinning is done from the accepted keyword row's pin icon.
5. Click Dismiss all and confirm accepted/pinned keywords remain.

### AI Task 10: Batch Queue UX Feedback

Status: Done for first pass.

What changed:

- Generate day now tracks current-day batch progress with total, completed, failed, skipped, and stopped state.
- More -> AI Keywords shows the batch queue as ready, running, stopped, or done with counts.
- While Generate day is running, the currently processed image is marked locally on the canvas and its keyword panel title changes to Generating for day.
- Stop day AI remains visible while the batch is active and stops unfinished work without clearing completed suggestions.
- Batch progress stays inside More/object-local panels and does not use global modals.

Manual test checklist:

1. Enable Qwen and place several Durable images without accepted keywords on the current day.
2. Open More -> AI Keywords and confirm Queue shows how many are ready.
3. Click Generate day and confirm Queue changes to progress such as 1 / 3 done.
4. Watch the active image: it should show a local batch/current processing state.
5. Click Stop day AI and confirm completed suggestions remain while unfinished images stop.

### AI Task 11: Durable AI Job Recovery Upgrade

Status: Done for first pass.

What changed:

- AI jobs that were queued, sending, or waiting during app close/reload are converted on launch into a recoverable failed state with the message `AI was interrupted`.
- Restart recovery dedupes AI jobs by object id, asset id, provider, model, prompt version, and locale so retries reuse the same image context instead of creating duplicate candidates.
- Canceled AI jobs stay canceled and are not auto-restarted.
- The affected image keeps its local failed/interrupted state and exposes Retry AI / Cancel actions from the object keyword panel.
- The automated recovery/export check now confirms the interrupted-job recovery helper and explicit interruption copy are present.

Manual test checklist:

1. Start a Suggest or Generate day job.
2. Close or reload the desktop app while the job is queued/sending/waiting.
3. Reopen the same day and image. It should show `AI was interrupted`, not an endless pending state.
4. Click Retry AI and confirm the same image is reused; no duplicate board object should appear.
5. Cancel a failed/interrupted job and restart. It should not auto-run again.

### AI Task 12: Provider Error Copy And Troubleshooting

Status: Done for first pass.

What changed:

- Qwen HTTP failures are now split into missing key, rejected key, model not found, timeout, rate limit, malformed output, working image missing, and network failure paths.
- Image-local AI failures show friendly copy first, while the raw error code remains available in hover/detail text.
- Data & Privacy -> AI Privacy includes a short setup/troubleshooting hint so the user knows where to fix key/model/network issues.
- `docs/AI_PROVIDER_SETUP.md` now has a troubleshooting map for common Qwen errors.

Manual test checklist:

1. Enable Qwen without an API key and run Test connection. It should say the Qwen API key needs to be added.
2. Use a deliberately bad key and run Test connection. It should say the API key was rejected.
3. Use a deliberately wrong `AESTHETICBOARD_QWEN_MODEL` and run Test connection. It should point to the Qwen model name.
4. Trigger malformed output during development and confirm the image says provider output format failed, not network failed.
5. Hover the local failure text and confirm the raw error code is still available for debugging.

### AI Task 13: Accepted AI Keyword Search Confirmation

Status: Done for first pass.

What changed:

- SQLite search now indexes manual keywords plus AI candidates whose review state is `accepted`.
- Suggested and dismissed AI candidates are deliberately excluded from the durable search haystack.
- The search behavior is ACK-backed because the SQLite index is rebuilt from the saved snapshot after persistence writes.
- The automated recovery/export check now covers accepted-only AI candidate indexing and confirms suggested/dismissed candidates remain invisible to search.

Manual test checklist:

1. Generate AI suggestions on a Durable image.
2. Search for one unreviewed suggestion before accepting it; it should not appear as trusted search metadata.
3. Accept or pin that suggestion, wait for Saved, then search again; it should appear.
4. Dismiss another suggestion, wait for Saved, and confirm search does not find it.
5. Restart desktop and repeat the search to confirm the same accepted-only behavior remains.

### AI Task 14: API Key Handling Upgrade Decision

Status: Done as a product/engineering decision for the current development stage.

Decision:

- Keep environment variables as the only supported API-key input for current development and internal testing.
- Do not add a renderer API-key field yet. The renderer can only see a safe status shape: provider id, available/missing, source, and `secretVisibleToRenderer: false`.
- Do not put API keys in source files, Profile JSON, exported JSON, backups, logs, screenshots, or Markdown docs.
- Move to OS credential storage later, before packaging or broader user testing, when the settings flow is stable enough to justify a real secret-management UI.

What changed:

- Added a provider key status helper that reports key availability/source without returning the secret value.
- Added an automated check that intentionally passes a fake secret and confirms it never appears in renderer-safe diagnostics.
- Updated local setup notes in the `docs/` folder; docs-folder changes are intentionally excluded from this PR.

Manual test checklist:

1. Start desktop without a Qwen key. Data & Privacy should show Qwen key as Not set.
2. Start desktop from a PowerShell session with `AESTHETICBOARD_QWEN_API_KEY`. Data & Privacy should show Available, never the key value.
3. Export JSON or backup and confirm no API key value appears.
4. Use the key only through PowerShell/env vars for now; do not paste it into repo files.

### AI Task 15: AI Manual QA Checklist And Demo Script

Status: Done for first pass.

What changed:

- Maintained the repeatable AI manual test checklist and review demo script in the local `docs/` folder; docs-folder changes are intentionally excluded from this PR.
- Project Status now records the short QA path for Enable Qwen, Test connection, Suggest, Retry AI, Cancel, Generate day, Stop day AI, Accept, Dismiss, Pin, Search, restart recovery, and Turn AI off.
- The checklist clearly separates no-network checks from real-Qwen checks that require an API key.
- No step asks the user to expose, paste into source, or screenshot the real API key.

Manual QA path:

1. Open More and confirm AI starts Off / local.
2. Enable Qwen only from the desktop session that has the key.
3. Run Test connection, then Suggest on one Durable image.
4. Retry or Cancel local failures from the affected image.
5. Run Generate day, watch progress, then Stop day AI.
6. Accept, Dismiss, and Pin suggestions.
7. Search accepted/pinned terms and confirm dismissed/unreviewed terms stay out.
8. Restart, confirm recovery state, then Turn AI off.

### AI Task 16: Next Provider Placeholder Boundaries

Status: Done for first pass.

What changed:

- GPT-5.7 Luna remains registered so the future provider direction is visible, but it is marked future-only / not connected in the provider capability list.
- Disabled providers can no longer become the active provider through stale local config; they fall back to local mock.
- Validation still rejects direct GPT-5.7 Luna requests as disabled, even if a stale config tries to opt into external/network access.
- Automated checks confirm GPT-5.7 Luna cannot enable external AI, cannot enable network access, and cannot reach the keyword generation path.

Manual test checklist:

1. Open Data & Privacy -> AI Privacy. GPT-5.7 Luna should read as future-only / not connected yet.
2. Confirm there is no usable GPT-5.7 Luna enable button in More.
3. Keep Qwen behavior unchanged: Enable Qwen / Turn AI off should still only affect Qwen/local mock.
4. If a stale Profile config names GPT-5.7 Luna, app state should fall back to local mock instead of trying a network call.
