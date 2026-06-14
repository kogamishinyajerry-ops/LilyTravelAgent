# Goals 971-980 Recap: Index Summary Chip In Studio

## Summary

This run surfaces the latest Recording Index QA `Proof Chain Summary` verification back into `/studio`, adding a compact `Index Summary 已验证` chip beside the existing `Summary 已入库` state.

## What Changed

| Goal slice | Area | Result |
| --- | --- | --- |
| 971-973 | Recording asset reader | Read optional `proofChainSummaryLine` from Recording Index QA notes, proof text, or local Studio proof fallback. |
| 974-977 | Studio workbench | Added an `Index Summary 已验证` / pending chip beside the Proof Chain Summary archive state. |
| 978-980 | QA and docs | Covered ready and missing-index-summary fallback states, verified the 16:9 card fit, then logged the change as a recording chapter. |

## Verification

- `npm test -- lib/recording-assets.test.ts components/studio-mode.test.tsx` passed with 53 tests.
- Browser verification against `http://localhost:3000/studio` showed `Summary 已入库`, `Index Summary 已验证`, 297px row width inside a 313px card, and 0 console errors.

## Recording Prompt

> 这一段可以讲“后期 Summary 也完成了回流验证”。Studio 采集 Summary，Index QA 验证 Summary，然后 Studio 回显 Index Summary 已验证。

## Next Recommended Goal

Goals 981-990 should surface the `Index Summary 已验证` state in the main `/studio` Recording Index QA card and script-mode proof checklist, so the primary recording rail can explain the final post-production note loop without requiring viewers to inspect the small script-material card.
