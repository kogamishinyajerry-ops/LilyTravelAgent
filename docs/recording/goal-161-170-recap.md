# Goals 161-170 Recap: Dali Landmark Detail Staging

Date: 2026-06-14

## Theme

This run made the Dali old-town gate and courtyard marker family more recognizable in pure 3D scene crops. The goal was not photo realism yet; it was to move from generic low-poly blocks toward destination-specific symbols that the lens comparison dashboard can review.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 161-164 | `1be41c0` | Added old-town gate and courtyard roof tiers, arch shadows, plinths, eaves, and light accents. |
| 165 | `93c92f4` | Packaged this recap and README entry. |
| 166 | closeout | Verified lint, 44 test files / 903 tests, and production build. |
| 167 | closeout | Push to GitHub after final closeout commit. |
| 168-170 | closeout | Next-goal handoff. |

## What Changed In The Canvas

- Old-town gate: stone plinth, darker gate opening, inner side shadows, lower eave, roof ridge, lanterns, and gate light.
- Bai courtyard arch: base slab, courtyard opening shadow, lower roof eave, roof ridge, side eaves, and round window retained as an accent.
- Existing lens comparison workflow now checks whether these details show up inside pure WebGL `*-scene.png` crops.

## Evidence

- `npm run lint && npm run build`
- `npm run lint && npm test && npm run build` (44 files, 903 tests, build passed)
- `DREAM_URL=http://127.0.0.1:3000/dream DREAM_LENSES=low-skyline npm run check:dream-lenses`
- `DREAM_URL=http://127.0.0.1:3000/dream npm run check:dream-lenses`
- Browser check: `/api/recording-assets/lens-comparison` read the latest five-lens batch, loaded 20 scene crops, and showed 0 broken images.

## Recording Angle

> 这一轮我开始给大理地标加辨识度。不是做照片级建模，而是先让古城门和白族院落在纯 3D crop 里有门洞、屋檐、阴影和灯点这些可识别符号。

## Next Recommended Goal

Goals 171-180 should add a lightweight before/after visual review aid for 3D tuning. Store the latest five-lens scene-crop batch metadata, expose the previous batch versus current batch in the dashboard, and make it easier to show that the landmark-detail pass changed the actual render.
