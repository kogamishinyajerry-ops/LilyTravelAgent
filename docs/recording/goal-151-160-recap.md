# Goals 151-160 Recap: Dali 3D Depth Staging

Date: 2026-06-14

## Theme

This run started improving the actual Dali 3D canvas render now that the comparison dashboard can isolate pure WebGL frames. The first pass added depth cues rather than another UI layer: foreground banks, water reflections, a distant ridge highlight, and lens-tuned active landmark scaling.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 151-154 | `d838647` | Added Dali 3D depth staging and recorded visual QA evidence. |
| 155 | `ac38f58` | Packaged this recap and README entry. |
| 156 | closeout | Final lint/test/build verification. |
| 157 | closeout | Push to GitHub. |
| 158-160 | closeout | Next-goal handoff. |

## What Changed In The Canvas

- Foreground water-bank strips create a stronger near-field plane.
- Additive water reflection strips make the Erhai surface less flat.
- A distant ridge highlight makes the mountain backdrop easier to read in pure scene crops.
- Active Dali landmarks get a lens-tuned foreground scale boost for Skyline and Detail modes.

## Evidence

- `npm run lint && npm run build`
- `npm run lint && npm test && npm run build` passed with 44 test files, 903 tests, and a successful production build.
- `DREAM_URL=http://127.0.0.1:3000/dream DREAM_LENSES=close-detail npm run check:dream-lenses`
- `DREAM_URL=http://127.0.0.1:3000/dream npm run check:dream-lenses`
- Browser check: `/api/recording-assets/lens-comparison` read the latest five-lens run, loaded 20 scene crops, and showed 0 broken images.

## Recording Angle

> 前一轮我先把评审对象缩到 WebGL 画面本体。这一轮开始真正动 3D 内容：加前景水岸、反光、远山线和 active landmark 的前景尺度，让 Dali 的纯 3D crop 更有空间层次。

## Next Recommended Goal

Goals 161-170 should make one landmark family visibly richer, starting with the Dali old-town gate/courtyard. Add more recognizable silhouette details, roof tiers, shadow accents, and a scene-crop comparison note so the dashboard can show a clearer before/after in the pure 3D frames.
