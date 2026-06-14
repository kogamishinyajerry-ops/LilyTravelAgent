# Goals 591-600 Recap: Studio Shows Script Material Index QA

Date: 2026-06-14

## Theme

This run surfaced the optional Recording Index QA `scriptMaterialCheck` back in `/studio`. The Proof Story `脚本素材` card now shows both the Studio QA capture status and the index-level script-material validation status.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 591-593 | parser | Added optional `scriptMaterialCheck` parsing to the latest Recording Index QA summary. |
| 594-596 | UI/tests | Added ready and missing Index QA status lines to the Proof Story `脚本素材` card. |
| 597 | browser | Confirmed the live `/studio` status line and screenshot evidence link return 200. |
| 598-600 | docs/gate | README and dev-log updated; final lint/test/build gate recorded. |

## What Changed In The Creator Loop

- `/studio` now shows `Index QA 已验证脚本素材 · 3/3` when the optional check exists.
- The ready line links to `recording-index-script-material-proof.png`.
- Missing state stays explicit with `Index QA 待验证脚本素材 · npm run check:recording-index`.
- The existing `QA 已捕获 · 复制脚本路径` Studio QA status remains separate.

## Evidence Captured

- `npm test -- lib/recording-assets.test.ts components/studio-mode.test.tsx` passed with 26 tests.
- Browser check confirmed the script-material Index QA line and a 200 screenshot response.
- `npm run lint && npm test && npm run build` passed after the change.

## Recording Angle

> 这一段可以讲“脚本素材证据闭环回到了录屏台”。Studio 卡片现在同时证明自己被捕获、被索引、被 Index QA 验证。

## Next Recommended Goal

Goals 601-610 should add a compact `Proof Story` closeout checklist in `/studio` that summarizes the four states in one line: script path ready, Studio QA captured, index entry present, and Index QA verified.
