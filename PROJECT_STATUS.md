# AestheticBoard Project Status

> Last updated: 2026-08-29
> Current local branch: pr/slices-15-17
> Latest PR: https://github.com/m2290882257-maker/AestheticBoard/pull/2

## Current Implementation State

AestheticBoard has moved from a static vertical-slice prototype into a desktop-capable capture board with local profile persistence.

Implemented slices:

| Slice | Status | Notes |
| --- | --- | --- |
| 01 | Done | Board shell, editable title, action bar, temporal controls, canvas, image object, keyword layer, quick note. |
| 02 | Done | Wheel zoom, reset view, zoom percent display. |
| 03 | Done | Image corner resize using pointer handles. |
| 04 | Done | Canvas pan through middle mouse / pointer flow. |
| 05 | Done | Clipboard image paste into canvas. |
| 06 | Done | Browser/file drag capture into canvas. |
| 07 | Done | Day-based local state model with temporal navigation. |
| 08 | Done | Electron desktop shell, window restore, always-on-top control. |
| 09 | Done | Background surface picker and Profile visibility in More menu. |
| 10 | Done | Dense / zoomed-out board behavior, keyboard controls, responsive and accessibility polish. |
| 11 | Done | Drag Harness diagnostics for desktop/browser drag payloads. |
| 12 | Done | Local Profile v1 scaffold under LocalAppData. |
| 13 | Done | SQLite metadata migration scaffold and profile schema. |
| 14 | Done | Atomic original media commit for local image captures and app-media asset loading. |
| 15 | Done | Persistence Worker queue with revision ACK. Renderer no longer treats timer-only localStorage writes as desktop Saved. |
| 16 | Done | Restart recovery from Profile snapshot for active day, camera, image geometry, z-order, lock, note, keyword state, and trash. |
| 17 | Done | Per-image capture lifecycle UI: Resolving, Localizing, Durable, Failed. Failures remain local to the image object. |
| 18 | Done | Typed mutation envelopes now replace renderer arbitrary snapshot saves at the preload/main boundary while preserving ACK-based Saved state. |
| 19 | Done | Capture jobs are persisted as recoverable queue records; launch recovery scans staging/originals and failed jobs remain object-local. |

## Verified Behaviors

- Typed persistence validation rejects unsupported mutation types before they reach the worker.
- Capture recovery validation marks interrupted localizing jobs as Failed and repairs durable jobs through the media index.
- `npm run check` passes across renderer, server, Electron main/preload, persistence, and media-store files.
- Temporary Profile validation confirms snapshot ACK, SQLite migration/write, recovery read, media index, and app-media path resolution.
- Desktop drag/link capture issue was diagnosed through Drag Harness and fixed for custom DataTransfer payloads.
- Trash now keeps discarded images/links until explicit delete or clear all.
- Window bounds and always-on-top state are persisted by Electron shell state.

## Current Architecture Reality

The current codebase is still intentionally lightweight and prototype-shaped:

- Renderer is implemented in plain `app.js`, not yet split into typed domain modules.
- Persistence Worker is currently a main-process queue class, not a separate worker thread.
- SQLite is accessed through `node:sqlite` when available and falls back to file snapshot persistence when unavailable.
- Profile snapshot is stored as `workspace-snapshot.json`; typed mutation batches append to `logs/mutation-log.jsonl`, and SQLite also stores a `canvas_state` copy for metadata continuity.
- Local captured images use `app-media://asset/<assetId>?variant=original`; capture job recovery uses `capture-jobs.json` plus the media index to repair interrupted localizing jobs. Remote image URL capture remains a reference path and is not yet safely fetched/localized.

## Known Technical Debt

- Move the codebase toward the documented process boundaries: main / preload / renderer / persistence / media / domain.
- Add a real SQLite driver strategy for Electron runtime if `node:sqlite` is not stable enough for packaging.
- Add Git LFS or another asset strategy for large font/media files, especially `refer/fonts/系统手写/PingFang.ttc`.
- Add Playwright/Electron automated checks for restart recovery and drag capture where feasible.
- Decide whether runtime UI labels remain English or need localized Chinese variants.

## Next Development Tasks

### Slice 20: Thumbnail / Working Derivatives

Goal: keep original immutable while rendering lighter working images on canvas.

Tasks:

1. Add media derivative records for original, working, and thumbnail variants.
2. Generate thumbnails/working copies behind a media adapter.
3. Update `app-media://asset/<assetId>?variant=...` to serve available variants.
4. Keep original path immutable and never overwrite original bytes.
5. Add fallback to original when derivative generation is pending or failed.

Acceptance:

- Canvas can render working variant without changing source original.
- Trash and restore preserve media asset relation.
- Missing derivative does not break the board.

### Slice 21: Object-Level Retry And Repair UI

Goal: complete the local failure model without modal interruptions.

Tasks:

1. Add compact object-local actions for Failed captures: Retry, Keep Reference, Remove.
2. Add local tooltip/details for capture error code.
3. Add Data & Privacy / Profile status detail in More menu.
4. Add a lightweight repair action for rebuilding media index from originals.

Acceptance:

- Capture failure is understandable from the object itself.
- No global modal appears for capture lifecycle failures.
- Repair actions do not modify image positions, notes, or keywords.

### Slice 22: Search / Filter Foundation

Goal: prepare retrieval without changing the spatial board model.

Tasks:

1. Index keyword text, note text, URL host/title, source type, capture date, and day title.
2. Add read-only search overlay or command entry.
3. Highlight matching objects without reflowing the canvas.
4. Allow jump-to-object by adjusting camera, not object position.

Acceptance:

- Search results never reorder or move board objects.
- Keyword/note edits update the searchable index after ACK.
- Search works across historical days.

### Slice 23: Export / Share First Pass

Goal: turn current day into a simple local export without introducing cloud sync.

Tasks:

1. Export current day metadata as JSON.
2. Export visible canvas or full day as PNG where feasible.
3. Add export status to Download / Share popover.
4. Include references to local media assets without exposing absolute paths in exported JSON unless explicitly requested.

Acceptance:

- Export never mutates board state.
- Export failure is scoped to the export popover/status.
- Exported JSON can be used later for import tests.

## Recommended Immediate Order

1. Slice 20: Thumbnail / Working Derivatives.
2. Slice 21: Object-Level Retry And Repair UI.
3. Slice 22: Search / Filter Foundation.
4. Slice 23: Export / Share First Pass.
5. Slice 24: Mutation Retry Queue And Conflict Surface.
6. Slice 25: Import / Restore Test Harness.


### Slice 24: Mutation Retry Queue And Conflict Surface

Goal: let failed mutation ACKs stay visible and recoverable without undoing optimistic renderer state.

Tasks:

1. Add an explicit retry queue for failed mutation IDs.
2. Surface object-level retry affordances for failed move, resize, lock, note, keyword, and trash mutations.
3. Keep retry ordering per day and per object.
4. Add a compact conflict indicator when a snapshot revision is older than the current ACK.

Acceptance:

- Failed ACKs can be retried without recreating objects.
- Optimistic object state stays visible until a user chooses a repair action.
- Retry does not duplicate capture jobs or trash entries.

### Slice 25: Import / Restore Test Harness

Goal: prove Profile recovery paths can be exercised repeatedly without manual file surgery.

Tasks:

1. Add a local-only diagnostics action to export a small restore fixture.
2. Add test fixtures for snapshot interruption, staging residue, durable media, and failed capture jobs.
3. Add a read-only verification command that reports restored days, objects, trash, media assets, and capture jobs.

Acceptance:

- A developer can reproduce restart recovery scenarios from fixtures.
- Verification never mutates the user board.
- Fixture outputs avoid absolute local media paths unless explicitly requested.
