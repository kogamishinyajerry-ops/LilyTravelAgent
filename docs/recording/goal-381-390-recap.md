# Goals 381-390 Recap: Recording Index QA Command

Date: 2026-06-14

## Theme

This run turned the manual recording-index browser check into `npm run check:recording-index`. The command regenerates the local archive, opens `/api/recording-assets/index`, verifies Dream Proof text, checks playback screenshot / summary / notes links, and writes a small `recordings/index-checks/*` proof pack.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 381-385 | c96e80a | Added `scripts/check-recording-index.mjs` and the `check:recording-index` npm command. |
| 386 | live proof check | `npm run check:recording-index` passed and wrote `recordings/index-checks/2026-06-14T07-58-51-630Z/summary.json`. |
| 387 | skipped precondition | `RECORDINGS_DIR=<empty> npm run check:recording-index` exited 0 with a clear skipped-precondition message. |
| 388 | docs | README and the recording asset pipeline docs now mention the command and the `index-checks` output. |
| 389 | full gate | `npm run lint && npm test && npm run build` passed with 44 files, 915 tests, and a successful production build. |
| 390 | next goal | Handoff prepared for surfacing the index-check result back in `/studio` so creators can see the archive QA status without reading terminal output. |

## What Changed In The Creator Loop

- Recording index QA now has a dedicated command: `npm run check:recording-index`.
- The command regenerates `recordings/index.html` before checking the API index page.
- The command verifies `Dream Proof`, final cue text, and playback screenshot path.
- The command checks the safe file API links for screenshot, summary, and notes.
- The command captures a proof-card screenshot and writes `summary.json` / `clip-notes.md` under `recordings/index-checks/`.
- If no local Dream visual-proof pack exists, the command exits cleanly and tells the creator to run `npm run check:dream-visuals`.

## Evidence Captured

- `node --check scripts/check-recording-index.mjs` passed.
- `npm run check:recording-index` passed against the local app.
- `RECORDINGS_DIR=<empty> npm run check:recording-index` confirmed graceful skip behavior.
- `npm run lint && npm test && npm run build` passed with 44 files, 915 tests, and a successful production build.

## Recording Angle

> 这一轮把“我手动打开素材总索引看一眼”变成了一个自动 QA 命令。它会刷新 archive，打开 API 总索引，确认 Dream Proof 还在，并且截图、summary、notes 三条证据链接都能打开。

## Next Recommended Goal

Goals 391-400 should surface the latest `index-checks` result in `/studio`, next to the existing Dream Proof / Candidate QA proof cards. The creator should be able to see “Recording Index QA passed” and open the generated proof-card screenshot, summary, and notes from the recording workbench.
