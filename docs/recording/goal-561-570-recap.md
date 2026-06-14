# Goals 561-570 Recap: Studio Script Material QA Status

Date: 2026-06-14

## Theme

This run read the latest Studio QA `scriptMaterial` result back into `/studio`. The Proof Story `脚本素材` card now shows whether QA captured it and links directly to the captured card screenshot.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 561-563 | parser | Added optional script-material parsing to the latest Studio proof playback summary. |
| 564-566 | UI/tests | Added `QA 已捕获` / `QA 待捕获` status on the script-material card with ready and missing tests. |
| 567 | browser | Confirmed `/studio` shows the QA status and the screenshot evidence link returns 200. |
| 568-570 | docs/gate | README and dev-log updated; full lint/test/build gate recorded. |

## What Changed In The Creator Loop

- `summary.scriptMaterial` from Studio QA is now parsed as optional structured evidence.
- `/studio` shows `QA 已捕获 · 复制脚本路径` when the latest Studio QA pack includes the script card capture.
- The status links to `studio-proof-story-script-material.png` through the existing recording-evidence file API.
- Missing state remains explicit: `QA 待捕获 · npm run check:studio-visuals`.

## Evidence Captured

- `npm test -- lib/recording-assets.test.ts components/studio-mode.test.tsx` passed with 25 tests.
- Browser check confirmed the script-material card status and a 200 screenshot evidence response.
- `npm run lint && npm test && npm run build` passed after the change.

## Recording Angle

> 这一段可以讲“脚本入口也变成了自证组件”。Studio 卡片不只显示脚本文档路径，还能证明自己已经被 QA 捕获，并直接跳到截图证据。

## Next Recommended Goal

Goals 571-580 should include the script-material screenshot in the recording asset index so `/api/recording-assets/index` and `recordings/index.html` show Proof Story Script Material alongside Dream Proof and Studio Proof.
