# Goals 141-150 Recap: Pure 3D Scene Crop QA

Date: 2026-06-14

## Theme

This run made the Director Lens comparison dashboard judge the actual 3D render instead of the surrounding product UI. Dream visual QA now exports pure WebGL canvas frames for D1-D4, the lens dashboard uses those `*-scene.png` crops, and the topbar reports how many scene crops are available.

## Commit Log

| Goal | Commit | Summary |
| --- | --- | --- |
| 141-144 | `a6d25fb` | Added pure WebGL D1-D4 scene crop export, summary/clip-note metadata, dashboard crop display, docs, and browser evidence. |
| 145 | `8f4f067` | Added total scene crop count to the comparison dashboard. |
| 146 | pending | Packaged this recap and README entry. |
| 147 | pending | Final lint/test/build verification. |
| 148 | pending | Push to GitHub. |
| 149-150 | closeout | Next-goal handoff. |

## Product Flow

1. Run `npm run check:dream-lenses`.
2. Each Dream QA pack now includes `dream-dali-d1-scene.png` through `dream-dali-d4-scene.png`.
3. Open `/studio`.
4. Click `镜头对比`.
5. Compare pure 3D D1-D4 frames across Auto, Water, Skyline, Atlas, and Detail.

## Evidence

- `npm test -- lib/lens-comparison.test.ts`
- `npm run lint && npm run build`
- `DREAM_URL=http://127.0.0.1:3000/dream npm run check:dream-lenses`
- Local QA output contained 20 `*-scene.png` files for the five-lens run.
- Browser check: `/api/recording-assets/lens-comparison` showed 20 scene images, 0 broken images, and `20 scene crops`.

## Recording Angle

> 我发现整页截图会把 UI 也带进视觉判断，所以把 QA 改成直接导出 WebGL canvas。现在这个看板看的就是 3D 画面本体，接下来才能认真判断视觉是不是变高级。

## Next Recommended Goal

Goals 151-160 should improve the actual 3D render content now that the review surface is cleaner. Start with one visible upgrade that the scene-crop dashboard can prove: add stronger destination terrain depth, clearer landmark silhouettes, and lens-specific foreground scaling for the Dali preset, then rerun `npm run check:dream-lenses` to compare pure 3D crops.
