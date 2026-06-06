# Real Scenic Preview Roadmap

## Goal

把 `/dream` 的核心视觉从“概念路书地图”升级为“游客出发前就能看见目的地大致长什么样”的震撼预览。

## Current MVP

- `/dream` 使用 Three.js 渲染程序化 3D 场景。
- `/api/generate-preview-asset` 会调用 MiniMax `image_generation` 生成 16:9 cinematic preview 图。
- 图片生成成功时，Three.js 把 AI 图作为远景贴片；失败或缺 key 时，回退到程序化地形/建筑。
- 预览图会按目的地、天数、视觉风格、模型、prompt 和路书内容生成 hash，并保存到 `.lily-cache/preview-assets`。同一路书重复录屏或刷新时优先读缓存，不重复调用图片生成。
- `/dream` 右侧资产面板会显示当前 cache key、时间、来源，并提供“清除”和“重生成”，用于录屏展示 Agent 的视觉资产管线。
- 每次真实图片生成会额外写入历史版本；历史抽屉可回看和恢复旧版画面。最新缓存负责快速复用，历史库负责保留多版视觉资产。
- 历史抽屉支持“设封面”，把某一版标记为最终路书封面，并同步为当前预览图，方便录屏展示从多版生成图里挑封面的工作流。
- `/share-preview` 会读取最终封面和路书 query 信息，生成一个 16:9 分享预览卡片，用来展示用户最终拿到的动态路书。
- `/dream` 已加入 Scenic Render Skill：上传风景照片后，MiniMax-M3 会生成地形、建筑、水体植被、光照、镜头、材质和图片 prompt 蓝图；后续预览资产重生成会把这份蓝图注入 cinematic prompt。
- 默认大理路线会按当天内容切换：
  - 古城/城门：古城轮廓
  - 才村/喜洲/码头：山体、水面、村落码头
  - 城市目的地：保留 City Skyline 体块能力
- 这版是“预览级建模”，不是测绘级真实地形或真实建筑模型。

## Why This Step Exists

直接做真实 3D 会遇到数据和成本问题：真实地形、建筑轮廓、景区模型、版权图片、加载性能、国内地图合规都要处理。

所以第一步先做可录屏、可交互、可被用户理解的视觉原型：

1. 用户输入目的地。
2. Agent 生成路书。
3. 前端根据目的地和每天关键词生成 3D 场景。
4. 同步生成一张 AI cinematic preview 图，作为远景贴片。
5. 后续再把程序化占位替换成真实地形和真实资产。

## Phase C Scaffolding (2026-06-06)

### What was added

- `lib/terrain-source.ts`: interface + `NoopTerrainSource` + `createDefaultTerrainSource`
- `lib/buildings-source.ts`: interface + `NoopBuildingsSource` + `createDefaultBuildingsSource`
- `lib/tile-coords.ts`: WGS84 → slippy map tile math
- `components/real-skyline-scene.tsx`: hybrid wrapper with fallback to `dream-skyline-scene`

### What was NOT added (deferred to next phase)

- Real Mapbox/MapTiler/terrain-rgb integration
- Real OSM Overpass / 高德 3D integration
- Actual 3D rendering of real buildings (currently just a placeholder)
- Wiring into the dream-roadbook page (still uses dream-skyline-scene)

### Why scaffold-first

Lets the UI/API contract stabilize before investing in real data. Recording can demo the scaffolding now and plug in real data later without changing the wrapper.

### How to plug in real data

Replace `createDefaultTerrainSource` / `createDefaultBuildingsSource` with concrete implementations; pass them as props to `<RealSkylineScene>`.

## Next Realism Layers

1. **Real terrain** — see `lib/terrain-source.ts` for the interface. Implement a `MapboxTerrainSource` / `MapTilerTerrainSource` and pass it as the `terrainSource` prop.

2. **Real building footprints** — see `lib/buildings-source.ts` for the interface. Implement an `OSMBuildingsSource` / `GaodeBuildingsSource` and pass it as the `buildingsSource` prop.

3. **真实建筑轮廓**
   - 城市路线接 OSM/地图建筑体块。
   - 中国目的地优先评估高德/国内地图 3D 能力。

3. **景点视觉资产**
   - 用 AI 生成“景点风格预览图”作为远景贴片。
   - 对高频目的地维护人工审核过的 landmark preset。

4. **混合渲染**
   - 真实地形 + 程序化建筑 + AI 远景贴片。
   - 生成失败时回退到当前 Three.js 程序化预览。

## Recording Angle

这一段可以讲：

> 我一开始做的几何路书不够真实，所以我把中间主视觉升级成 Three.js 预览层。现在它还不是测绘级实景，但已经把路书从文字攻略变成“目的地预告片”。下一步才是接真实地形、真实建筑和 AI 生成景点图。
