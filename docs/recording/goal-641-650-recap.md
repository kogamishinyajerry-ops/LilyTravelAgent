# Goals 641-650 Recap: Proof Story Production Assets In Browser Index

## Summary

This run mirrored the `Proof Story Production Assets` grouping from `recordings/clip-index.md` into both visual asset indexes: generated `recordings/index.html` and dynamic `/api/recording-assets/index`.

## What Changed

| Goal slice | Area | Result |
| --- | --- | --- |
| 641-643 | Static index | The generated HTML index now shows a compact production-assets card for Studio packs with script-material evidence. |
| 644-646 | Dynamic index | `/api/recording-assets/index` renders the same card and keeps the safe file links. |
| 647-650 | QA compatibility | The card still includes `Proof Story Script Material`, the cue text, and the three evidence links required by Recording Index QA. |

## Verification

- `node --check scripts/index-recording-assets.mjs` passed.
- `npm run index:recording-assets` indexed 76 packs and wrote `Proof Story Production Assets` into `recordings/index.html`.
- Browser check against `http://localhost:3000/api/recording-assets/index` confirmed the card is visible, the three evidence links are present, and console errors are empty.
- `npm run check:recording-index` passed and wrote `recordings/index-checks/2026-06-14T09-41-19-179Z/summary.json`.

## Recording Prompt

> 这一段可以讲“同一套 Proof Story 生产素材，现在 Markdown 和浏览器都能看”。这让素材库不只是技术 QA，也能直接服务录屏讲解和后期剪辑。

## Next Recommended Goal

Goals 651-660 should surface a tiny `Production Assets` readiness chip in `/studio` that tells creators whether the browser index and clip index both contain the Proof Story production-assets grouping, without adding another large panel.
