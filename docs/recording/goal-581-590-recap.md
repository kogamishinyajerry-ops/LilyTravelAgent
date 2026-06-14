# Goals 581-590 Recap: Recording Index QA Checks Script Material

Date: 2026-06-14

## Theme

This run made Proof Story Script Material an optional Recording Index QA check. Dream Proof and Studio Proof remain the required baseline, while script-material evidence is verified when the latest Studio QA summary includes `summary.scriptMaterial`.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 581-583 | local proof read | `scripts/check-recording-index.mjs` reads optional script-material data from the latest Studio QA pack. |
| 584-586 | browser QA | The API index check verifies `.script-material-proof` and its screenshot, summary, and notes links. |
| 587 | evidence | A fresh index-check pack wrote `scriptMaterialCheck` while keeping baseline `links` at 6. |
| 588-590 | docs/gate | README and dev-log updated; full lint/test/build gate recorded. |

## What Changed In The Creator Loop

- The archive QA command now validates Proof Story Script Material when it exists.
- Baseline Dream + Studio proof checking still requires six links and remains unchanged.
- The optional check writes `scriptMaterialCheck` into `summary.json`.
- `clip-notes.md` includes a Proof Story Script Material section only when the optional check ran.

## Evidence Captured

- `node --check scripts/check-recording-index.mjs` passed.
- `npm run check:recording-index` passed.
- Local evidence pack: `recordings/index-checks/2026-06-14T09-24-23-279Z/`.
- `summary.json` includes `links: 6` plus `scriptMaterialCheck` with three HTTP 200 links.

## Recording Angle

> 这一段可以讲“可选证据不污染基线”。Dream 和 Studio 仍然是必检六链接，脚本素材是发现就验、没有就不挡路的附加证据。

## Next Recommended Goal

Goals 591-600 should surface the optional script-material index QA result back in `/studio`, for example as a small `Index QA 已验证脚本素材` line on the Proof Story `脚本素材` card.
