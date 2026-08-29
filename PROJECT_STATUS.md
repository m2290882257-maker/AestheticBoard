# AestheticBoard Project Status

> Last updated: 2026-08-29
> Current local branch: pr/slices-15-17
> Latest PR: https://github.com/m2290882257-maker/AestheticBoard/pull/2

## Current Implementation State

AestheticBoard has moved from a static vertical-slice prototype into a desktop-capable capture board with local profile persistence, recoverable media capture, SQLite-backed search, local export/import, durable retry metadata, full-day export, hardened remote capture policy, backup/restore UX, local-first AI keyword review, provider opt-in boundaries, keyword conflict detail, object-local and batch imported media repair, disabled external-provider consent surfaces, and polished Day / Weekly / Monthly navigation surfaces.

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
- The automated recovery script now reports `Slice 34/35/36/37/38/39/40/41/42/43/44/45 checks passed`.
- External AI provider requests are rejected by the keyword gateway unless a future explicit opt-in exists.
- Missing imported media can stay visible as a local object with Relink file / Keep ref actions.
- Relink validates SHA-256 when available and commits matched files into the same durable media pipeline as local captures.
- Import, export, search, retry, and backup flows remain local-only and non-destructive by default.

## Current Architecture Reality

- Renderer is still mostly plain `app.js`; Slice 32 started helper extraction but more module split is still needed.
- Persistence Worker is currently a main-process queue class, not a separate worker thread.
- SQLite uses `node:sqlite` when available and falls back to JSON snapshot persistence when unavailable.
- Profile snapshot is stored as `workspace-snapshot.json`; mutation batches append to `logs/mutation-log.jsonl` and mirror into SQLite where possible.
- Local, remote-localized, and relinked images render through `app-media://asset/<assetId>?variant=working` with original fallback.
- Search is SQLite-backed in desktop, with renderer search as browser preview fallback.
- External AI providers are defined only as disabled metadata. Local mock remains the only runnable keyword provider.

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

- Confirm external AI provider settings remain disabled.
- Confirm local mock keyword generation does not make a cloud/API request.
- Confirm unsafe remote URL targets stay blocked or become references instead of being fetched.
- Confirm failed saves or capture failures stay local to the affected object/control and do not open a global modal.

## Next Development Packages

Current priority can now move from panel cleanup into concrete AI introduction. The plan below is intentionally larger-grained than the earlier slices, but keeps the safety details that protect local-first data, user consent, and non-blocking board interaction.

### AI Package 1: Real Provider Connector Behind The Existing Gateway

Goal: connect one real image-understanding provider without letting the renderer talk to the provider directly.

Tasks for review:

- Add a desktop-main AI connector that receives only approved keyword jobs from the existing keyword gateway.
- Keep local mock as the default provider; real provider remains off until the user explicitly enables it in Data & Privacy.
- Store provider config locally without exposing secrets to renderer UI code.
- Validate provider responses before they can become keyword candidates.
- Keep all AI failures object-local; failed AI never blocks capture, drag, note editing, search, export, or restart recovery.

Acceptance:

- With provider disabled, the app behaves exactly like today and makes no external AI request.
- With provider enabled, one image can produce candidate keywords through the same review UI as local mock.
- Invalid provider output is shown as a local keyword failure, not written as trusted keywords.

### AI Package 2: Consent, Provider Settings, And Test Mode

Goal: make AI activation understandable and reversible before any external data leaves the device.

Tasks for review:

- Upgrade Data & Privacy from disabled provider copy into a real opt-in settings surface.
- Show what the provider can access: image working derivative, existing pinned keywords if allowed, no quick note by default.
- Add a test connection action that does not send user board images.
- Add a clear off switch that stops new AI jobs while preserving existing user-approved keywords.
- Add local audit metadata for provider, consent version, job id, and timestamp.

Acceptance:

- User can tell whether AI is mock/offline/external before pressing generate.
- Turning AI off stops new external jobs and does not delete pinned keywords.
- Test connection proves config works without uploading board content.

### AI Package 3: Durable AI Job Queue And Retry

Goal: make real AI jobs survive restart and recover cleanly from network/provider errors.

Tasks for review:

- Persist AI job states separately from image capture states: queued, uploading, waiting, succeeded, failed, canceled.
- Dedupe AI jobs by image asset, provider, prompt version, and locale so retries do not spam duplicates.
- Add object-local retry/cancel controls for failed or pending AI jobs.
- Keep generated candidates separate from pinned keywords until the user accepts them.
- Ensure search indexes only ACKed pinned/accepted keywords first.

Acceptance:

- Killing the app during an AI job does not corrupt the board or duplicate image objects.
- Restart restores pending/failed AI job state on the affected image.
- Retrying AI does not duplicate candidates or overwrite user-pinned keywords.

### AI Package 4: Prompt Contract, Output Quality, And Safety Fixtures

Goal: make AI keyword output useful for aesthetic retrieval while staying schema-bound.

Tasks for review:

- Implement the SystemPrompt contract as versioned prompt metadata, not loose renderer text.
- Require structured keyword candidates with dimension/type, confidence, provider, and source timestamp.
- Add fixtures for malformed JSON, unsafe content, empty result, timeout, and duplicate keywords.
- Add lightweight quality checks for duplicate words, overly generic labels, and missing dimensions.
- Keep prompt/version changes visible in local metadata for later debugging.

Acceptance:

- Provider output cannot enter the board unless it passes schema validation.
- Bad AI responses stay inspectable as failed candidate state.
- Prompt version is visible enough to explain why a set of candidates was generated.

### AI Package 5: Batch Suggestions Without Auto-Organizing The Board

Goal: speed up keyword creation for many images while keeping user spatial layout untouched.

Tasks for review:

- Add a selected-day action to queue suggestions for images without accepted keywords.
- Throttle jobs and show per-object progress instead of a global blocking modal.
- Let users review candidates object by object; no automatic pinning or board rearrangement.
- Add a stop/pause action for newly queued batch jobs.
- Keep export/import/backup aware of AI job and candidate metadata.

Acceptance:

- Batch AI never moves, resizes, groups, sorts, or hides board objects.
- User can keep working while suggestions run.
- Stopping batch jobs preserves completed candidate results and marks the rest as canceled or queued.

## Review Request

Please review the AI package order above before implementation. Recommended order is AI Package 1 -> 2 -> 3 -> 4 -> 5, because the provider connector should stay behind the existing gateway, then consent/settings, then durable job reliability, then prompt hardening, then batch speed-up.
