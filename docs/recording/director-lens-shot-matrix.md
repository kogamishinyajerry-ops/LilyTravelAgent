# Director Lens Shot Matrix

Purpose: pick a camera direction before recording a `/dream` clip, then verify the same direction in the local QA pack.

| Lens id | UI label | Best for | Recording move | QA proof | QA command |
| --- | --- | --- | --- | --- | --- |
| `auto` | Auto | Default product walkthrough. | Start here, then explain the system chooses a day-specific camera. | `auto day lens` | `npm run check:dream-visuals` |
| `wide-water` | Water | Lakes, coasts, bridges, islands. | Click D2 first and show the wide route shape. | `wide-water lens` | `DREAM_LENS=wide-water npm run check:dream-visuals` |
| `low-skyline` | Skyline | City skyline, harbor, mountain silhouettes. | Switch to `Skyline`, then click D1-D4 to show stronger depth. | `skyline 1.34x / water 1.08x / route 1.18x` | `DREAM_LENS=low-skyline npm run check:dream-visuals` |
| `isometric-atlas` | Atlas | Route overview, architectural clusters, Monument-Valley style. | Show the route rail and Proof Stack as a structured map. | `isometric-atlas lens` | `DREAM_LENS=isometric-atlas npm run check:dream-visuals` |
| `close-detail` | Detail | Courtyards, food streets, textures, photo spots. | Pair the lens with the asset panel and talk about grounded detail. | `close-detail lens` | `DREAM_LENS=close-detail npm run check:dream-visuals` |

## How To Use

1. Pick the lens that best matches the clip thesis.
2. Select the same lens in `/dream`.
3. Click D1-D4 once.
4. Point to `Agent Visual Contract`, `Proof Stack`, and `资产缓存`.
5. Point to Scene Inspector `Tune` when using `low-skyline`.
6. Run the matching QA command before or after recording to generate `summary.json`, `index.html`, and `clip-notes.md`.

## Clip Thesis Examples

- `Skyline`: "我把城市天际线镜头变成可选项，而不是让 AI 随机决定画面。"
- `Atlas`: "路线规划可以像游戏地图一样被导演出来。"
- `Detail`: "路书不只讲大景，也能生成适合拍照和美食细节的预览方向。"
