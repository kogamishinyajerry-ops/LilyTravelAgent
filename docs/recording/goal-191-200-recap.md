# Goals 191-200 Recap: Best Recording Candidates

Date: 2026-06-14

## Theme

This run turned the diff dashboard into a creative-decision surface. It now ranks the strongest changed scene crops and gives the creator a compact set of shots to record next.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 191-194 | pending | Added ranked Best Recording Candidates from existing diff metrics. |
| 195 | pending | Added focused tests and recording docs. |
| 196 | pending | Browser/local request visual check. |
| 197 | pending | Final lint/test/build verification. |
| 198 | pending | Push to GitHub. |
| 199-200 | closeout | Next-goal handoff. |

## What Changed In The Review Surface

- The dashboard now shows a `Best Recording Candidates` strip above batch metadata.
- Candidates are ranked by the existing explainable diff score.
- Each candidate shows lens, day, day label, raw delta detail, and cue.
- Each candidate links back to `/dream?demo=...&lens=...`.

## Evidence

- `npm test -- lib/lens-comparison.test.ts` (6 tests passed)
- `npm run lint` (passed)
- Browser/local request check: `/api/recording-assets/lens-comparison` showed 4 candidate links, 40 image URLs, and 0 broken images.

## Recording Angle

> 这一步是把 QA 看板变成创作者工作台：Agent 不只是告诉我哪里 Changed，还直接帮我挑出最适合录屏的 Top shots。

## Next Recommended Goal

Goals 201-210 should turn the selected candidate into a smoother recording handoff. Add an optional query parameter or anchor so candidate links can open `/dream` with the correct lens and a visible candidate cue, then show a small return path back to the comparison dashboard.
