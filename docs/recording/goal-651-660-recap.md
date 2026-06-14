# Goals 651-660 Recap: Studio Production Assets Readiness

## Summary

This run surfaced Proof Story production-assets readiness back into `/studio`. The recording-assets summary now checks the latest Studio script-material evidence plus `recordings/index.html` and `recordings/clip-index.md` for the `Proof Story Production Assets` grouping.

## What Changed

| Goal slice | Area | Result |
| --- | --- | --- |
| 651-653 | Data summary | Added a small readiness object with `scriptMaterialReady`, `htmlIndexReady`, `clipIndexReady`, and `ready`. |
| 654-656 | Studio UI | Added a compact `Production Assets` chip inside the existing Proof Story `脚本素材` card. |
| 657-660 | Tests/docs | Added ready and missing-state tests, plus README/dev-log documentation. |

## Verification

- `npm test -- lib/recording-assets.test.ts components/studio-mode.test.tsx` passed with 31 tests.
- Browser check against `http://localhost:3000/studio` confirmed `Production Assets · HTML + Clip 已入库` is visible, compact, and console errors are empty.

## Recording Prompt

> 这一段可以讲“Studio 现在能读回素材库状态”。我不是只做了一个漂亮卡片，而是让脚本素材、HTML 索引、Markdown 索引和 Studio 状态互相闭环。

## Next Recommended Goal

Goals 661-670 should update `npm run check:recording-index` so the optional script-material check also asserts the `Proof Story Production Assets`, narration preview, and closeout status text, not only the old label/cue/link baseline.
