# Goals 791-800 Recap: Complete Line In Recording Index

## Summary

This run adds the Studio QA `Proof Story Complete` archive line to the local recording asset index, so the final closeout proof can be browsed from `recordings/index.html` and `recordings/clip-index.md`.

## What Changed

| Goal slice | Area | Result |
| --- | --- | --- |
| 791-793 | Index parser | Read optional `scriptMaterial.completeLine` from Studio QA summaries. |
| 794-797 | Index outputs | Rendered the Complete line inside the existing `Proof Story Production Assets` HTML and Markdown sections. |
| 798-800 | Verification/docs | Checked ready and legacy fixture behavior, regenerated the real local index, and documented the archive workflow. |

## Verification

- `node --check scripts/index-recording-assets.mjs` passed.
- Temporary ready/legacy fixture check passed: ready output includes `Proof Story Complete`; legacy output omits it and leaks no `undefined`.
- `npm run index:recording-assets` passed and indexed 78 packs.
- `recordings/index.html` and `recordings/clip-index.md` contain `Proof Story Complete · Delivery 已入库 · Handoff 已复制 · QA 收据就绪`.

## Recording Prompt

> 这一段可以讲“QA summary 里的最终收口证明已经进入素材总索引”。我不需要回到 Studio 页面，也能从 archive 里看到这条 proof-story 完成线。

## Next Recommended Goal

Goals 801-810 should mirror the same Complete archive line into the dynamic `/api/recording-assets/index` browser view and its `npm run check:recording-index` validation, so the static local index and API-served index stay aligned.
