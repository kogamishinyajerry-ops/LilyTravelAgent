# Goals 271-280 Recap: Candidate Click-Through QA

Date: 2026-06-14

## Theme

This run added a local QA check for the candidate queue handoff. The script clicks the dashboard's primary action, first candidate card, and a queue chip, then verifies `/dream` receives the matching rank, day, and lens context.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 271-275 | pending | Added `check:lens-candidate-handoff`, Playwright click-through validation, and recording docs. |
| 276 | pending | Local QA should confirm all three candidate entry points land on `/dream` with matching context. |
| 277 | pending | Final lint/test/build verification. |
| 278 | pending | Push to GitHub after closeout commit. |
| 279-280 | pending | Next-goal handoff. |

## What Changed In The Creator Loop

- The candidate queue now has an explicit click-through QA command.
- The check covers `Open first candidate`, first candidate card, and one queue chip.
- The script verifies active `/dream` lens and active day, not just URL text.
- Screenshots, `summary.json`, and `clip-notes.md` are written under `recordings/candidate-handoff-checks/`.

## Evidence To Capture

- `npm run check:lens-candidate-handoff`
- `npm run lint`
- `npm run lint && npm test && npm run build`

## Recording Angle

> 这一轮是把产品链路变成可验证链路。不是我肉眼说能跳转，而是脚本点击三个入口，然后确认 /dream 真的带着 rank、day、lens 进入录屏场景。

## Next Recommended Goal

Goals 281-290 should surface the latest candidate-handoff QA result in `/studio`'s recording asset panel, so the creator can see whether the dashboard-to-`/dream` candidate route has been verified before recording.
