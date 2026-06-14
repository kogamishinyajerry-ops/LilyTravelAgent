# Goals 961-970 Recap: Proof Chain Summary In Recording Index QA

## Summary

This run extends the Recording Index pipeline so the optional `Proof Chain Summary` line from Studio QA appears in the static index, the served `/api/recording-assets/index` page, and the automated Recording Index QA notes.

## What Changed

| Goal slice | Area | Result |
| --- | --- | --- |
| 961-963 | Static recording index | Added optional Proof Chain Summary output to `recordings/index.html` and `recordings/clip-index.md`. |
| 964-966 | API index | Mirrored the same Summary line in `/api/recording-assets/index`. |
| 967-970 | Index QA | Asserted the Summary line when present and recorded it in generated index-check clip notes. |

## Verification

- `node --check scripts/index-recording-assets.mjs` passed.
- `node --check scripts/check-recording-index.mjs` passed.
- `npm run index:recording-assets` passed and indexed 81 packs.
- Static `recordings/index.html`, `recordings/clip-index.md`, and `/api/recording-assets/index` contain `Proof Chain Summary`.
- `npm run check:recording-index` passed and generated `recordings/index-checks/2026-06-14T12-04-40-698Z/clip-notes.md` with the Summary line.
- Browser verification of `/api/recording-assets/index` found the Summary line, script-material links, and 0 console errors.

## Recording Prompt

> 这一段可以讲“后期 notes 也进入总素材库”。Studio QA 捕获 Summary，Recording Index 归档 Summary，Index QA 再自动验收 Summary。

## Next Recommended Goal

Goals 971-980 should surface the latest Recording Index QA `Proof Chain Summary` verification back into `/studio`, showing an `Index Summary 已验证` chip beside `Summary 已入库`.
