# Goals 951-960 Recap: Summary Archive Chip In Studio

## Summary

This run reads the latest Studio QA `proofChainSummaryLine` back into `/studio`, adding a compact `Summary 已入库` chip beside the Proof Chain Summary copy action.

## What Changed

| Goal slice | Area | Result |
| --- | --- | --- |
| 951-953 | Recording asset reader | Read optional `proofChainSummaryLine` and `proofChainSummaryCopyState` from Studio QA summaries. |
| 954-957 | Studio workbench | Added a `Summary 已入库` / pending archive chip beside `复制 Summary`, using the archived Summary line first when available. |
| 958-960 | QA and docs | Covered ready and legacy fallback states, verified the 16:9 fit, then logged the change as a recording chapter. |

## Verification

- `npm test -- lib/recording-assets.test.ts components/studio-mode.test.tsx` passed with 52 tests.
- Browser verification against `http://localhost:3000/studio` showed `Summary 已入库`, 297px row width inside a 313px card, and 0 console errors.

## Recording Prompt

> 这一段可以讲“后期 notes 也完成回流闭环”。Summary 从页面复制，到 Studio QA 采集，再回到 Studio 显示已入库。

## Next Recommended Goal

Goals 961-970 should add the archived `Proof Chain Summary` line to the Recording Index pipeline, so the post-production note also appears in `recordings/index.html`, `recordings/clip-index.md`, and Recording Index QA.
