# Goals 181-190 Recap: Explainable Visual-Diff Badges

Date: 2026-06-14

## Theme

This run made the before/after dashboard more narratable. Instead of asking the creator to visually inspect every crop from scratch, the dashboard now labels each current-vs-previous D1-D4 pair as `Changed`, `Subtle`, or `Missing` using existing canvas stats.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 181-185 | `9fedec3` | Added explainable scene-stat diff logic, dashboard badges, focused tests, and recording docs. |
| 186 | `9fedec3` | Browser/local request check confirmed 6 Changed, 14 Subtle, 0 Missing, 40 image URLs, and 0 broken images. |
| 187 | closeout | Final lint/test/build verification: 44 files, 905 tests, build passed. |
| 188 | closeout | Push to GitHub after final closeout commit. |
| 189-190 | closeout | Next-goal handoff. |

## What Changed In The Review Surface

- Current-vs-previous crop pairs now show `Changed`, `Subtle`, or `Missing` badges.
- The diff is based on existing `canvasStats`: checksum delta, lit delta, and varied delta.
- The caption keeps the raw deltas visible, so the score remains explainable during recording.
- No image-processing dependency was added.

## Evidence

- `npm test -- lib/lens-comparison.test.ts` (5 tests passed)
- `npm run lint` (passed)
- Browser/local request check: `/api/recording-assets/lens-comparison` showed 6 Changed, 14 Subtle, 0 Missing, 40 image URLs, and 0 broken images.
- `npm run lint && npm test && npm run build` (44 files, 905 tests, build passed)

## Recording Angle

> 这一轮我给 before / after 看板加了一个“解释型差异徽章”。不是黑箱评分，而是直接用已有 canvasStats：checksum、lit、varied，让录屏时可以说清楚为什么这帧算 Changed。

## Next Recommended Goal

Goals 191-200 should make the diff dashboard more useful for creative decisions. Add a compact "Best Recording Candidate" strip that ranks the top changed shots by lens/day, links each candidate back to `/dream?lens=...`, and keeps the ranking explainable from the same diff metrics.
