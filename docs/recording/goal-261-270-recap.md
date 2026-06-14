# Goals 261-270 Recap: Candidate Why Badge And Focus State

Date: 2026-06-14

## Theme

This run made the thumbnail candidate queue feel more like a finished recording control. Candidate cards now fill the existing strip height, show a `Why:` badge from the existing diff metric, and respond to hover/focus without changing the first viewport.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 261-265 | `e8f1ad5` | Added stable-height candidate cards, hover/focus treatment, a `Why:` badge, focused data coverage, and recording docs. |
| 266 | `e8f1ad5` | Browser check confirmed 4 `Why:` badges, 4 thumbnails, 4 candidate links, unchanged first-viewport availability, and 0 broken images. |
| 267 | closeout | Final lint/test/build verification: 44 files, 909 tests, build passed. |
| 268 | closeout | Push to GitHub after final closeout commit. |
| 269-270 | closeout | Next-goal handoff. |

## What Changed In The Creator Loop

- Candidate cards now visually respond to hover/focus.
- Each card explains the top diff signal with a compact `Why:` badge.
- The card content is bounded inside the existing strip height so the first viewport does not grow.
- The ranking and `/dream` handoff URLs remain unchanged.

## Evidence

- `npm test -- lib/lens-comparison.test.ts` (7 tests passed)
- `npm run lint` (passed)
- Browser check: `/api/recording-assets/lens-comparison` showed 4 `Why:` badges, 4 candidate thumbnails, 4 candidate links, 44 image URLs, and 0 broken images.
- `npm run lint && npm test && npm run build` (44 files, 909 tests, build passed)

## Recording Angle

> 这一轮是产品质感：候选卡不只是能点，还能解释为什么选它。`Why:` 徽章来自 diff 指标，hover/focus 又让录屏时当前候选更清楚。

## Next Recommended Goal

Goals 271-280 should add a compact candidate click-through QA check that verifies `Open first candidate`, the first candidate card, and one queue chip all land on `/dream` with matching rank/day/lens context.
