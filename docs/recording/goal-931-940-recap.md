# Goals 931-940 Recap: Proof Chain Summary Copy

## Summary

This run adds a one-click `Proof Chain Summary` action in `/studio`, copying the final Chain state, Index Chain state, Index QA notes path, and Studio script-material screenshot path as a compact post-production note.

## What Changed

| Goal slice | Area | Result |
| --- | --- | --- |
| 931-933 | Summary line | Built a deterministic `Proof Chain Summary` from existing Chain state, Index Chain state, Index QA receipt path, and Studio script screenshot path. |
| 934-937 | Studio action | Added a compact preview and `复制 Summary` action inside the Proof Story script-material card. |
| 938-940 | QA and docs | Covered ready and missing-evidence copy states, fixed row overflow, then logged the change as a recording chapter. |

## Verification

- `npm test -- components/studio-mode.test.tsx` passed with 36 tests.
- Browser verification against `http://localhost:3000/studio` confirmed the copied summary matched the visible preview.
- The browser check found `Index QA notes: index-checks/...`, `Studio script screenshot: studio-checks/...`, a 297px row inside a 313px card, and 0 console errors.

## Recording Prompt

> 这一段可以讲“最终证据链变成一条后期 notes”。Chain 状态、Index QA notes、Studio 截图路径一次复制，剪辑阶段不用重新翻素材目录。

## Next Recommended Goal

Goals 941-950 should add a small `Proof Chain Summary 已复制` QA capture to `npm run check:studio-visuals`, so the post-production note line is also written into Studio QA `summary.json` and `clip-notes.md`.
