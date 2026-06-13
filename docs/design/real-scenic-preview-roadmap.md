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
- `/dream` 默认程序化场景和可选真实地形场景都使用同一套高质量 WebGL 渲染基线：ACES 电影色调、sRGB 输出、软阴影、高性能抗锯齿、动态水面、分层雾气和胶片合成层。
- `/share-preview` 会读取最终封面和路书 query 信息，生成一个 16:9 分享预览卡片，用来展示用户最终拿到的动态路书。
- `/dream` 已加入 Scenic Render Skill：上传风景照片后，MiniMax-M3 会生成地形、建筑、水体植被、光照、镜头、材质和图片 prompt 蓝图；后续预览资产重生成会把这份蓝图注入 cinematic prompt。
- 默认大理路线会按当天内容切换：
  - 古城/城门：古城轮廓
  - 才村/喜洲/码头：山体、水面、村落码头
  - 城市目的地：保留 City Skyline 体块能力
- 大理已接入第一版目的地专属 cinematic scene preset：苍山分层剪影、洱海岸线、白族院落体块和 D1-D4 当天焦点光标都来自 `lib/cinematic-scene-preset.ts`，不再完全依赖通用几何场景。
- 海岸/海岛 preset 已从数据层进入 Three.js 渲染层：D1-D4 可以出现灯塔、海湾帆影、港口拱廊、日落观景台、沙洲和水面高光。
- `/dream` 控制栏提供大理/海岸本地演示路书切换，录屏和视觉 QA 不需要每次等待 MiniMax 真实生成。
- 这版是“预览级建模”，不是测绘级真实地形或真实建筑模型。

## Why This Step Exists

直接做真实 3D 会遇到数据和成本问题：真实地形、建筑轮廓、景区模型、版权图片、加载性能、国内地图合规都要处理。

所以第一步先做可录屏、可交互、可被用户理解的视觉原型：

1. 用户输入目的地。
2. Agent 生成路书。
3. 前端根据目的地和每天关键词生成 3D 场景。
4. 同步生成一张 AI cinematic preview 图，作为远景贴片。
5. 后续再把程序化占位替换成真实地形和真实资产。

## Phase N: WebGL Render Quality Baseline (v0.8.3, 2026-06-13)

This phase answers the product-quality gap directly: the destination preview cannot feel like a rough toy scene if it is meant to compete as a travel product.

### What changed

- `components/dream-skyline-scene.tsx` now uses a high-quality renderer setup: `powerPreference: "high-performance"`, sRGB output, ACES filmic tone mapping, exposure tuning per mood, and soft shadow maps.
- The default `/dream` scene gained cinematic lighting and atmosphere: lower ambient wash, stronger directional sun, a background sun disc, layered haze planes, vignette composition, and a more camera-like framing.
- Water is now an animated `MeshPhysicalMaterial` surface with clearcoat, reflectivity, specular route ribbons, per-frame vertex waves, and real shadow receiving.
- Terrain moved from flat-shaded faceting toward smoother normals and shadow-receiving material, so the scene reads more like stylized terrain rather than raw boxes.
- `components/real-skyline-scene.tsx` gets renderer parity: ACES tone mapping, sRGB output, high-performance WebGL settings, shadow maps, softer terrain material, and shadowed building extrusions.
- `app/globals.css` adds the final composition layer: brighter background-photo integration, light bloom, subtle dark vignette, and real-scene film overlays.

### Why this matters

The previous scene proved the workflow, but the visual ceiling was too low. This baseline does not claim real photogrammetry or Unreal-style fidelity; it establishes the minimum web-rendering quality needed before investing in heavier real-world asset pipelines. From here, every future layer can be judged against a clearer product bar: higher fidelity geometry, better landmark presets, real terrain, and AI-generated backplates all need to improve a scene that already has credible lighting and camera treatment.

### Recording angle

> 我没有先换复杂 3D 引擎，而是先把网页端 Three.js 的渲染基线拉起来：色调映射、软阴影、动态水面、雾气、镜头暗角。这样即使真实照片或真实地形还没完全接上，用户看到的也不再是粗糙方块，而是一个有电影感的目的地预览。

## Phase O: Dali Cinematic Scene Preset (2026-06-13)

### What changed

- Added `lib/cinematic-scene-preset.ts` as the first destination-specific scene asset layer.
- The Dali preset defines structured visual ingredients: layered Cangshan mountain bands, Erhai shoreline curves, Bai courtyard blocks, and four day-specific focus anchors.
- `components/dream-skyline-scene.tsx` resolves the preset from the generated roadbook text and mounts the additional Three.js layer only when the roadbook is actually Dali-related.
- `lib/cinematic-scene-preset.test.ts` locks the matching behavior: default Dali resolves, D1-D4 switch focus, non-Dali city roadbooks do not accidentally mount Dali assets.

### Why this matters

The first high-quality rendering pass improved lighting and materials, but the scene was still generic. This phase starts the asset-product layer: popular destinations can have curated, testable visual presets that preserve the Agent workflow while making the preview feel location-specific. It also creates a clean extension point for future Kyoto, Iceland, Morocco, New York, and Dali-plus variants.

### Recording angle

> 上一轮我把 Three.js 的画质基线拉起来；这一轮开始解决“像不像这个地方”。我先给大理做一个专属 scene preset：苍山在后面，洱海有岸线，古城和喜洲有白族院落体块，D1-D4 会切换当天焦点。这样每个目的地未来都可以有自己的视觉资产，而不是所有城市共用一套方块。

## Phase P: Day-Director Camera (2026-06-13)

### What changed

- Added `buildCinematicCameraPose()` to `lib/cinematic-scene-preset.ts`.
- The helper turns the active Dali focus anchor into a camera position, `lookAt`, FOV, and parallax weight.
- `components/dream-skyline-scene.tsx` now initializes the Three.js camera from that pose and applies a subtle animated look-at drift, so D1-D4 change framing instead of only changing labels.
- `lib/cinematic-scene-preset.test.ts` verifies the default pose, the wider Erhai water-day lens, and the left-biased Xizhou village framing.

### Why this matters

Static 3D scenes feel like thumbnails. A roadbook needs direction: every day should imply a different shot. This phase keeps the implementation small, but introduces a real director layer that can later support stronger shot grammar: wide establishing shots, village close-ups, sunset water shots, and city skyline pans.

### Recording angle

> 大理有了视觉资产之后，我继续加“导演层”：D1 古城、D2 洱海、D3 喜洲，不只是按钮文案变，镜头也会跟着当天焦点轻微换构图。这样路书开始像一个动态预告片，而不是静态地图。

## Phase Q: Cinematic Route Rail (2026-06-13)

### What changed

- Added `buildCinematicRouteRail()` to `lib/cinematic-scene-preset.ts`.
- The helper turns D1-D4 focus anchors into a stable world-space route rail with an active-day index.
- `components/dream-skyline-scene.tsx` renders the route rail inside the Three.js scene: a soft full-route line, a brighter active-progress segment, and glowing day anchors.
- `lib/cinematic-scene-preset.test.ts` verifies route ordering, active-day detection, and unknown-day fallback.

### Why this matters

The roadbook already had day buttons and a mini map, but the main 3D world did not yet communicate the route. This phase makes the itinerary spatial inside the hero scene: users can see that D1-D4 are not isolated cards, but connected travel beats across the same destination.

### Recording angle

> 我把路线从按钮搬进了 3D 世界。D1-D4 不再只是底部几个按钮，而是一条在场景里发光的 route rail：全路线是淡线，已经走到的段落会更亮。动态路书开始像一个可浏览的旅行预告片。

## Phase R: Scene Preset Inspector (2026-06-13)

### What changed

- Added `buildCinematicSceneInspector()` to `lib/cinematic-scene-preset.ts`.
- The helper converts the active roadbook/day into a recording-friendly inspector payload: active preset, destination, shot label, visual cue, route progress, route-point count, FOV, camera X, and parallax.
- `/dream` now shows a compact Scene Inspector directly under the mini map so the visual asset pipeline is visible while the 3D scene is running.
- `lib/cinematic-scene-preset.test.ts` verifies Dali active-state summaries, D3 route progress, and unsupported-destination fallback behavior.

### Why this matters

The scene now has destination assets, camera direction, and a route rail, but those systems were mostly invisible to a viewer. This phase turns the internal director layer into product UI: useful for debugging, useful for users who want to understand what the Agent produced, and especially useful for silent screen recording where the workflow needs to read clearly without voiceover.

### Recording angle

> 我把 3D 场景背后的 Agent 决策暴露出来：当前用了哪个目的地 preset，今天是哪个 shot，路线走到哪里，镜头 FOV 和 parallax 是多少。这样录屏时观众能看到：这不是一张静态图，而是一条从路书内容到视觉资产再到 3D 导演层的生成管线。

## Phase S: Day Landmark Silhouettes (2026-06-13)

### What changed

- Added `buildCinematicLandmarkSilhouettes()` to `lib/cinematic-scene-preset.ts`.
- The Dali preset now maps D1-D4 into recognizable marker types: old-town gate, Erhai sail, Bai courtyard arch, and return-day cafe.
- `components/dream-skyline-scene.tsx` renders those markers as lightweight Three.js geometry inside the existing Dali preset layer, with the active day scaled and brightened.
- `lib/cinematic-scene-preset.test.ts` verifies marker ordering, kind mapping, active-day emphasis, and unknown-day fallback.

### Why this matters

The route rail showed the itinerary as a path, but the individual route beats still needed stronger destination memory. This phase adds small landmark silhouettes that make each day easier to read at a glance without depending on heavy imported 3D assets. It is still procedural and fast, but it gives the product a clearer visual vocabulary for destination-specific previews.

### Recording angle

> 我继续把大理从“抽象漂亮”往“有辨识度”推进：D1 是古城门，D2 是洱海帆影，D3 是白族院落拱门，D4 是咖啡和返程收尾。先用轻量程序化几何做地标语汇，后面再把真实照片和 AI 贴片接得更重。

## Phase T: Day Atmosphere Director (2026-06-13)

### What changed

- Added `buildCinematicAtmosphereProfile()` to `lib/cinematic-scene-preset.ts`.
- The helper converts the active Dali focus into render parameters: fog color/range, sun color/intensity/position, sun-disc placement, haze opacity, water color/opacity, tone-mapping exposure, and water-glint strength.
- `components/dream-skyline-scene.tsx` now applies that profile to the Three.js `Fog`, directional sun, atmosphere planes, water material, and water specular ribbons.
- `lib/cinematic-scene-preset.test.ts` verifies the generic fallback, brighter Erhai water day, calmer Xizhou morning, and warmer return-day hour.

### Why this matters

D1-D4 already had route, camera, and landmark changes; atmosphere makes those beats feel more cinematic. The implementation remains pure-data and testable, but the output starts to behave more like shot direction: water days become brighter and glintier, village days become calmer, and return days get warmer closure.

### Recording angle

> 这一轮我没有换大框架，而是继续加“导演层”：同样是大理，D2 洱海应该更水、更亮，D3 喜洲应该更安静，D4 收尾应该更暖。于是我把雾、太阳、水面、高光都做成 day atmosphere profile，让路书每天的视觉情绪真的不一样。

## Phase U: Scene-Aware Preview Image Prompt (2026-06-13)

### What changed

- Added `buildCinematicScenePromptLine()` to `lib/preview-asset.ts`.
- The preview-image prompt now includes the resolved destination scene preset when available: preset id, destination, hero label, active shot, visual cue, active landmark silhouette, atmosphere profile, water color, and sun color.
- `lib/preview-asset.test.ts` verifies Dali D2 prompt alignment, D4 switching, and unsupported-destination fallback wording.
- The change is prompt-only and does not call MiniMax image generation during tests.

### Why this matters

The WebGL scene and AI image backplate should not feel like two separate products. This phase uses the same data-driven director layer for both: the Three.js foreground and the generated far-view image now share the route focus, landmark vocabulary, and atmosphere profile. That makes future generated backplates more likely to match the actual interactive scene.

### Recording angle

> 现在我把 3D 场景里的导演数据反向喂给图片生成 prompt：D2 洱海会告诉图片模型“这是大理 preset、洱海 shot、帆影地标、erhai-sunset 氛围”；D4 会换成 return-cafe 和 return-amber。这样 AI 图不是随便生成一张风景，而是跟网页里的动态路书共用同一套导演层。

## Phase V: Cinematic Micro-Motion Profile (2026-06-13)

### What changed

- Added `buildCinematicMotionProfile()` to `lib/cinematic-scene-preset.ts`.
- The helper maps the active Dali focus into water speed/amplitude, haze drift, focus pulse, and active-landmark breathing values.
- `components/dream-skyline-scene.tsx` now collects named motion targets from the Three.js scene and applies the profile inside the existing animation loop.
- `lib/cinematic-scene-preset.test.ts` verifies generic drift, stronger Erhai water motion, calmer Xizhou stillness, and return-day focus glow.

### Why this matters

High-quality dynamic roadbooks need motion restraint, not random animation everywhere. This phase keeps movement subtle and data-driven: water days glide more, village days stay calmer, and return days get a warmer pulse. The result is more alive on screen while preserving the quiet premium style.

### Recording angle

> 动态路书不是把所有东西乱动起来，而是让每一天有自己的微动节奏。D2 洱海的水面和 haze 更流动，D3 喜洲更安静，D4 收尾的焦点和地标有一点暖光呼吸。这个 motion profile 继续沿用前面的数据驱动方式。

## Phase W: Local Dream Visual QA (2026-06-13)

### What changed

- Added `scripts/check-dream-visuals.mjs`.
- Added `npm run check:dream-visuals`.
- The script opens `/dream`, clicks D1-D4, verifies Scene Inspector text, checks WebGL canvas pixels, verifies D2 motion by comparing two canvas checksums, and saves screenshots plus `summary.json`.
- It also writes a local `index.html` gallery with the four screenshots, Inspector summaries, canvas metrics, and motion evidence.
- Outputs go to `recordings/visual-checks/`, which remains git-ignored for local recording and review.

### Why this matters

The visual stack is now complex enough that "looks good on my screen" is not enough. This phase gives every future visual iteration a repeatable local review pack: screenshots, pixel checks, motion evidence, browser console errors, and a readable gallery. It supports both engineering confidence and the user's recording workflow.

### Recording angle

> 视觉产品不能只靠主观感觉。我加了一个本地视觉 QA 命令：自动打开 /dream，点 D1-D4，截图，检查 WebGL 像素，确认微动还在，然后写 summary.json 和一个 HTML gallery。以后每次打磨画面，都能留下可复盘的视觉证据。

## Phase X: Coastal Scene Preset Data Layer (2026-06-13)

### What changed

- Added `COASTAL_CINEMATIC_SCENE_PRESET` to `lib/cinematic-scene-preset.ts`.
- Generalized scene preset id, focus anchor, landmark, atmosphere, and motion unions so more destinations can share the same director helpers.
- The new preset covers D1-D4 coastal beats: lighthouse arrival, turquoise bay, harbor street, and sunset deck.
- `lib/cinematic-scene-preset.test.ts` verifies coastal preset resolution, route progress, landmark mapping, atmosphere profiles, motion profiles, and Dali non-regression.

### Why this matters

The Dali work proved the cinematic director model, but a product needs repeatability across destinations. This phase starts proving that the scene-preset layer can become a catalog rather than a one-off: new destinations can add route anchors and director metadata first, then later get custom render geometry.

### Recording angle

> 我没有马上把第二个目的地的 3D 全部做完，而是先把数据层扩成多目的地：海岸/海岛也有 D1-D4 的镜头、地标、氛围和微动。这样证明这个系统不是为大理写死的，而是能长成一个 preset catalog。

## Phase Y: Coastal Three.js Landmark Rendering (2026-06-13)

### What changed

- `components/dream-skyline-scene.tsx` now routes cinematic preset rendering by preset id.
- The Dali preset continues to render Bai courtyard blocks and Dali-specific landmark silhouettes.
- The coastal island / bay preset now renders a separate waterfront layer with sandbars, water glints, harbor blocks, lighthouse, bay sail, harbor arcade, and sunset deck.
- The change preserves the existing route rail, focus beacon, atmosphere profile, motion profile, and Scene Inspector behavior.

### Why this matters

Phase X proved the data catalog; this phase proves the catalog can drive visible destination-specific geometry. It is still lightweight procedural 2.5D rather than photogrammetry, but the user-facing scene no longer treats every non-Dali marker as a Dali gate. This gives the product a clearer path toward beach, skyline, mountain, and old-city visual packs.

### Recording angle

> 上一轮我把海岸路线做成数据 preset，这一轮把它真正接进 Three.js。D1 是灯塔，D2 是海湾帆影，D3 是港口拱廊，D4 是日落观景台。这样用户不是只看到文字换了，而是能看到目的地视觉语汇也跟着变。

## Phase Z: Local Demo Roadbook Switch (2026-06-13)

### What changed

- Added `coastalSampleRoadbook` beside the default Dali sample roadbook.
- `/dream` now exposes a local demo switch for Dali and coastal roadbooks in the control panel.
- Switching demo roadbooks resets transient generation, map, asset, scenic, and landmark state so one sample does not leak into another.
- `scripts/check-dream-visuals.mjs` now supports `DREAM_DEMO=coast`, clicks the coastal demo route, and asserts that Scene Inspector activates the coastal preset before writing the screenshot gallery.
- `components/dream-roadbook.test.tsx` covers the coastal demo switch and Inspector output.

### Why this matters

The visual product needs repeatable demo material. Waiting for a real MiniMax generation every time makes screen recording and visual regression checks inconsistent. This phase keeps the real generation flow intact while adding a local fixture path that can reliably show the multi-destination preset catalog.

### Recording angle

> 我现在给 `/dream` 加了一个本地演示切换：不用重新调用 MiniMax，也可以从大理切到海岸样例。这样录屏时我能稳定展示多目的地 preset catalog，同时自动视觉 QA 也能检查海岸这条路径有没有坏。

## Phase D: real data sources (2026-06-07)

Replaced the Phase C procedural stubs with real implementations:

- `lib/mapbox-terrain-source.ts` — `MapboxTerrainSource` fetching Mapbox terrain-rgb tiles, with a small dependency-free PNG decoder and a tokenless fallback.
- `lib/overpass-buildings-source.ts` — `OverpassBuildingsSource` querying the OpenStreetMap Overpass API for building footprints in a center+radius bbox.
- Both sit behind the same `TerrainSource` / `BuildingsSource` interfaces introduced in Phase C; no renderer changes were needed.

`/dream` gets a new "真实地形管线" opt-in toggle in the right-side panel. When the toggle is on and `MAPBOX_TOKEN` is set, `<RealSkylineScene>` mounts with the real sources; otherwise the existing procedural `DreamSkylineScene` continues to render unchanged.

## Phase E: real render + new sources + recording (v0.4.0, 2026-06-07)

Three pillars land together for v0.4.0:

1. **Real rendering** — `components/real-skyline-scene.tsx` was rewritten to project real terrain-rgb heightmaps onto a `PlaneGeometry` and extrude real building footprints into meshes. The earlier placeholder geometry is gone.
2. **Data source expansion** — three new sources join the Phase C/D set:
   - `lib/maptiler-terrain-source.ts` — `MapTilerTerrainSource`, an alternative to Mapbox that reuses the same `decodeTerrainRgb` helper.
   - `lib/gaode-buildings-source.ts` — `GaodeBuildingsSource`, the 高德 (Amap) 3D counterpart to Overpass, picking the env var from `AMAP_KEY` (and `GAODE_KEY` for back-compat).
   - `lib/composite-buildings-source.ts` — `CompositeBuildingsSource`, a fan-out merger that dedupes by id and swallows per-source errors so one upstream failure does not blank the whole scene.
3. **Recording** — `lib/recording-helper.ts` is a small state machine that auto-cycles the `/dream` templates on a fixed interval. `components/dream-roadbook.tsx` mounts it as a "开始录制" toggle in the right-side panel, and `e2e/recording.spec.ts` drives it from Playwright. The toggle is the camera-ready demo surface for this release.

All three pillars are isolated behind the existing interfaces, so the Phase C / D contracts stay intact and the procedural fallback still works for anyone without tokens.

## Phase I (v0.8.0) — M3 Stability + Error UX

### What was added

- `lib/m3-client.ts`: 中心化的 M3 客户端，统一封装请求、timeout、取消与重试入口。所有 M3 路由（dream / scenic / landmark / preview asset）都走它，避免每个调用点重复写重试逻辑。
- `lib/m3-error-classifier.ts`: 把 M3 返回的异常归类到 8 种错误类型（见下表），为上层决定是否重试和展示什么文案提供依据。
- `lib/retry-policy.ts`: 通用重试策略——3 次尝试 + 指数退避 + 抖动（exponential backoff with jitter），并按错误类型白名单决定是否触发重试。
- `lib/error-ux.ts`: 错误文案与 UI 状态映射层，负责把分类后的错误转成中文提示、重试按钮可见性与兜底提示。
- `components/error-ux.tsx`: 错误展示组件，渲染中文错误消息、"重试"按钮和"已回退到程序化资产"等兜底提示，挂在 `/dream` 与生成按钮的失败态上。

### Retry policy

- **最多 3 次尝试**（含首次）。
- **指数退避**：基础间隔 × 2^(attempt-1)，例如 1s / 2s / 4s。
- **抖动（jitter）**：在每次退避基础上叠加随机偏移，避免多个并发请求在同一时刻重试打挂上游。
- **按错误类型白名单触发**：仅对可恢复错误自动重试，不可恢复错误直接走 UX 兜底。

### Error categories

| Category | Retryable | 典型场景 |
| --- | --- | --- |
| `network` | 是 | DNS 失败、连接被重置、socket 异常 |
| `timeout` | 是 | 上游超过 `MINIMAX_TIMEOUT_MS` 未响应 |
| `rate_limit` | 是 | 上游返回 429 / 限流提示 |
| `server` | 是 | 上游 5xx、网关错误 |
| `auth` | 否 | API key 缺失或无效（401/403） |
| `parse` | 否 | 返回体不是合法 JSON |
| `schema` | 否 | JSON 不符合预期 schema（被 schema 校验拦下） |
| `invalid_request` | 否 | 请求参数缺失或非法（400） |

### UX behavior

- 失败时优先展示**中文错误消息**（`lib/error-ux.ts` 提供），避免英文堆栈暴露给最终用户。
- 文案旁边提供**"重试"按钮**，点击后重新走 `m3-client`，对可恢复错误会按策略自动重试，对不可恢复错误也允许用户手动再试一次。
- 凡是触发回退（例如回到程序化 Three.js 场景或程序化 landmark preset），界面都会出现**"已回退"提示**，让录屏与真实使用场景都能直观看到降级路径。

## Phase H (v0.7.0) — AI Landmark Preset

### What was added

- `lib/landmark-preset.ts`: 新的 Landmark Preset schema 与 TypeScript 类型，描述几何体、材质、灯光、锚点等字段。
- `lib/landmark-fallbacks.ts`: 8 个程序化兜底 preset，覆盖大理三塔、东方明珠、故宫角楼等高频目的地，M3 不可用时自动启用。
- `lib/landmark-renderer.ts`: 渲染层，把 `Landmark Preset` JSON 翻译成 `THREE.Group`，挂到 `<DreamSkylineScene>` 的地标锚点。
- `lib/landmark-generator.ts`: M3 调用层，输入目的地 / 风格 / 照片上下文，输出结构化 preset JSON，并做 schema 校验与回退。
- `.lily-cache/landmark-presets/`: 本地缓存目录，按目的地 + preset hash 命中，刷新不重复调用 M3。
- `/api/generate-landmark-preset`: 新的 API 路由，包装 generator + 缓存 + 回退逻辑，对外暴露统一接口。

### How to plug in real M3

1. 在 `.env.local` 中设置 `MINIMAX_API_KEY`（与现有 M3 通道共用）。
2. 启动 `npm run dev`，进入 `/dream`。
3. 在右侧资产面板点击"生成 AI 地标"按钮，前端会调用 `/api/generate-landmark-preset`，由 M3 实时生成 preset JSON 并渲染到场景中。
4. 同一目的地再次点击会命中本地缓存；如需强制重新生成，点"清除"再点"生成"。

### Fallback behavior

- M3 调用失败、超时、返回非法 JSON、超出 schema 校验 → 自动从 `lib/landmark-fallbacks.ts` 选一个最接近的程序化 preset。
- 缓存命中时直接读 `.lily-cache/landmark-presets/`，不调用 M3。
- 8 个程序化兜底 preset 永远可用；不依赖任何 API key，也不依赖 M3 可用性，确保 `/dream` 在最差网络条件下也能正常展示地标几何。
- 回退到程序化 preset 时，资产面板会标注来源为 `fallback`，方便录屏时区分 AI 生成 vs 兜底。

## Phase F Scaffolding (v0.5.0) — 高德 3D 建筑全量

### What was added

- `lib/building-height-estimator.ts`: heuristics + tag parsing — estimates building heights from footprint area, level counts parsed from OSM/高德 tags (`building:levels`, `height`, `building:height`), and tag-class heuristics (e.g. residential vs industrial vs commercial). Returns a height value usable for 3D extrusion.
- `lib/gaode-buildings-source.ts`: upgraded to `extensions=all` — the 高德 (Amap) buildings query now asks the API to return the full extension field set so downstream code can read `height`, `name`, `type`, and other attributes needed for richer 3D meshes.
- `lib/gaode-3d-buildings-source.ts`: new multi-strategy source — `Gaode3DBuildingsSource` is a strategy aggregator that tries (a) 高德 extensions=all, (b) per-type-code queries (residential / commercial / public / landmark), and (c) the estimator fallback. Picks the first strategy that yields usable building data for the requested bbox.
- `lib/composite-buildings-source.ts`: height-aware dedupe — `CompositeBuildingsSource` now dedupes not only by id but also by footprint overlap with a height tie-breaker, so the same building supplied by two upstream sources keeps the richer height value.

### What was NOT added (out of scope)

- Real 高德 3D vector tiles — requires an enterprise AMAP service contract; the public Web Service API does not expose raw 3D tile endpoints.
- Client-side 高德 3D building extrusion — the renderer still uses the existing footprint+height extrusion pipeline; we are not switching to a 高德-native 3D engine.
- Building interior data — floor plans, room layouts, and POI internals are out of scope; we only need footprints, height, type, and name for the 3D scene.

### How to plug in real heights

If 高德 later exposes an enterprise height API (raw 3D tile service, mesh endpoint, or a `height` field in a paid tier), add a new strategy in `Gaode3DBuildingsSource` that calls it and returns buildings with real heights tagged `source=gaode-height-api`. The composite source will pick that strategy's height over the estimator's via the new height-aware dedupe. Until that API is available, the estimator in `lib/building-height-estimator.ts` is the best available height source — it is the default strategy in the chain.

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
