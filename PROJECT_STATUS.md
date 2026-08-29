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
| 20 | Done | Media assets now track original, working, and thumbnail variants; canvas uses working variant with original fallback. |
| 21 | Done | Failed captures have object-local Retry, Keep Reference, and Remove actions; More includes profile details and media index repair. |
| 22 | Done | Search index covers days, titles, keywords, notes, links, hosts, dates, and source types; results highlight objects without reflow and jump by camera. |
| 23 | Done | Download / Share can export current-day JSON locally and desktop viewport PNG without mutating board state; desktop exports use a Save As dialog. |
| 24 | Done | Failed mutation ACKs are kept in an ordered retry queue with object-level Retry save / Keep actions and a compact conflict indicator. |
| 25 | Done | Restore harness can export sanitized Profile fixtures and run a read-only Profile verification summary. |
| 26 | Done | Remote image URLs are captured immediately as references, then localized through the capture job/media derivative pipeline when supported. |

## Verified Behaviors

- Typed persistence validation rejects unsupported mutation types before they reach the worker.
- Capture recovery validation marks interrupted localizing jobs as Failed and repairs durable jobs through the media index.
- Derivative validation confirms original/working/thumbnail records, variant fallback, and media index repair.
- `npm run check` passes across renderer, server, Electron main/preload, persistence, and media-store files.
- Temporary Profile validation confirms snapshot ACK, SQLite migration/write, recovery read, media index, and app-media path resolution.
- Desktop drag/link capture issue was diagnosed through Drag Harness and fixed for custom DataTransfer payloads.
- Trash now keeps discarded images/links until explicit delete or clear all.
- Window bounds and always-on-top state are persisted by Electron shell state.
- Search works across saved historical days and highlights current-day matches without moving or reordering objects.
- Export JSON omits absolute local media paths; desktop JSON and PNG exports open a Save As dialog so the user chooses the destination folder.
- Failed save ACKs now remain visible without reverting optimistic object state, and can be retried globally or per object.
- Restore diagnostics can export sanitized fixture JSON and verify days, objects, trash, media assets, and capture jobs without mutating the board.
- Remote image URL drops stay visible immediately, then localize in the desktop main process with URL, type, size, and magic-byte validation; unsupported URLs remain object-local failures with retry/keep actions.

## Current Architecture Reality

The current codebase is still intentionally lightweight and prototype-shaped:

- Renderer is implemented in plain `app.js`, not yet split into typed domain modules.
- Persistence Worker is currently a main-process queue class, not a separate worker thread.
- SQLite is accessed through `node:sqlite` when available and falls back to file snapshot persistence when unavailable.
- Profile snapshot is stored as `workspace-snapshot.json`; typed mutation batches append to `logs/mutation-log.jsonl`, and SQLite also stores a `canvas_state` copy for metadata continuity.
- Local and supported remote captured images render through `app-media://asset/<assetId>?variant=working` with fallback to original; capture job recovery uses `capture-jobs.json` plus the media index to repair interrupted localizing jobs. Unsupported remote URL capture remains a reference path with object-local retry.
- Search is currently a renderer-built read-only index over the loaded snapshot, not a dedicated SQLite FTS table yet.
- Export is local-only: JSON works in browser preview or desktop; PNG capture is desktop-only through Electron `capturePage`; desktop exports ask for a save path before writing.
- Mutation retry is renderer-managed over the current optimistic state; a future pass can move retry metadata into a dedicated durable retry table.
- Restore harness fixtures are small JSON scenarios under `fixtures/restore-harness`; they intentionally reference relative media paths only.

## Known Technical Debt

- Move the codebase toward the documented process boundaries: main / preload / renderer / persistence / media / domain.
- Add a real SQLite driver strategy for Electron runtime if `node:sqlite` is not stable enough for packaging.
- Add Git LFS or another asset strategy for large font/media files, especially `refer/fonts/系统手写/PingFang.ttc`.
- Add Playwright/Electron automated checks for restart recovery and drag capture where feasible.
- Decide whether runtime UI labels remain English or need localized Chinese variants.

## Next Development Tasks

## Recommended Immediate Order

1. Slice 27: SQLite Search Index / FTS Upgrade.
2. Slice 28: Import First Pass.
3. Slice 29: Durable Mutation Retry Metadata.
4. Slice 30: Export Full-Day Renderer.
5. Slice 31: Remote URL Fetch Policy And Host Controls.
