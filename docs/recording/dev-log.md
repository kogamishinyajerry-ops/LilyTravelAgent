# LilyTravelAgent Dev Log

Use this file as the silent-screen-recording companion. Add one entry per clip while building or reviewing.

## Clip Template

```text
Date:
Clip title:
What changed:
Why this matters:
Files shown:
Command/result:
Voiceover note:
Usable for:
```

## Initial Build Notes

Date: 2026-06-04
Clip title: MVP scope lock
What changed: Chose a local Next.js MVP that generates a Dali roadbook with MiniMax and maps it with Amap geocoding + Leaflet.
Why this matters: Keeps the first video series focused on a visible product instead of a broad platform.
Files shown: README.md, .env.local.example, app/api/generate-roadbook/route.ts, app/api/geocode-places/route.ts
Command/result: npm run lint
Voiceover note: "先做能录、能看、能分享的版本，后面再产品化。"
Usable for: intro, technical breakdown, first demo

## Creator Track Notes

Date: 2026-06-04
Clip title: Add the Vibe Coding learning layer
What changed: Added an in-app Creator Track panel and recording docs that explain the development process, learning journey, and clip ideas.
Why this matters: The project now supports the account goal directly: not only a pretty roadbook, but a clear story about learning AI-assisted development.
Files shown: lib/vibe-coding-content.ts, components/travel-agent-app.tsx, docs/recording/content-system.md, docs/recording/vibe-coding-learning-journal.md
Command/result: npm run lint && npm run build
Voiceover note: "我不想只展示最后的结果，我想把怎么拆需求、怎么让 AI 输出稳定、怎么验证，都变成内容。"
Usable for: Vibe Coding reflection clip, behind-the-scenes clip, long-video middle section

## Studio Mode Notes

Date: 2026-06-04
Clip title: Add 16:9 recording mode
What changed: Added `/studio`, a recording-first layout with input controls, roadbook preview, and Creator Track visible in one frame.
Why this matters: It gives the account a stable screen for demos, voiceover, and Vibe Coding breakdowns without rearranging the normal product UI.
Files shown: app/studio/page.tsx, components/studio-mode.tsx, lib/sample-roadbook.ts, app/globals.css
Command/result: npm run lint && npm run build
Voiceover note: "这个页面不是普通用户入口，而是专门为录屏设计的，把我要讲的三件事放在一张 16:9 画面里。"
Usable for: first demo, content recap, tutorial intro, product-thinking clip

## Dream Roadbook Notes

Date: 2026-06-04
Clip title: Add the dream-roadbook prototype
What changed: Added `/dream`, an original 2.5D visual roadbook with floating geometric day islands, minimal text, and mood switching.
Why this matters: It turns the project from a practical itinerary generator into a visually distinctive content concept.
Files shown: app/dream/page.tsx, components/dream-roadbook.tsx, app/globals.css
Command/result: npm run lint && npm run build
Voiceover note: "这一版不是追求信息密度，而是探索一种更像旅行梦境地图的路书表达。"
Usable for: high-design demo, account positioning, visual hook, product direction exploration

## Scenic Render Skill Notes

Date: 2026-06-05
Clip title: Turn landscape photos into render blueprints
What changed: Added a `/dream` Scenic Render Skill panel. Users can upload a landscape photo, ask MiniMax-M3 for a structured terrain/building/lighting/camera blueprint, then apply it to the cinematic preview asset generation flow.
Why this matters: The product moves from generic AI scenery toward user-specific destination previews, while still keeping a clear fallback when the visual model endpoint is unavailable.
Files shown: components/dream-roadbook.tsx, lib/scenic-render-skill.ts, app/api/generate-scenic-render-design/route.ts, lib/preview-asset.ts
Command/result: npm run lint && npm run build
Voiceover note: "我先不做重资产真实 3D，而是把照片转成可执行的视觉蓝图，让 Agent 的视觉管线先跑起来。"
Usable for: Vibe Coding workflow clip, AI product architecture clip, visual asset pipeline demo

## Scenic Sample Library Notes

Date: 2026-06-05
Clip title: Add a one-click real-photo sample library
What changed: Added four local Scenic Render Skill demo photos: Dali mountain/lake, coast, city skyline, and China alley. `/dream` can now load any sample into the M3 photo-to-render workflow with one click.
Why this matters: Recording no longer depends on manually finding a photo before every take; the demo starts from a stable asset set.
Files shown: public/sample-photos/ATTRIBUTION.md, lib/scenic-sample-photos.ts, components/dream-roadbook.tsx, docs/design/scenic-render-skill.md
Command/result: npm run lint && npm run build
Voiceover note: "我给这个视觉 skill 配了一个真实照片示例库，这样录屏时可以直接演示大理、海边、城市和街巷四种场景。"
Usable for: product demo, Vibe Coding process clip, visual pipeline explanation

## One-Click Sample Read Notes

Date: 2026-06-05
Clip title: Make sample photos auto-run M3 reading
What changed: Clicking a Scenic Render Skill sample photo now loads the image and immediately triggers MiniMax-M3 photo-to-render design. Manual uploads still require the read button.
Why this matters: Recording the visual Agent workflow now takes one click instead of two, making the demo cleaner and easier to repeat.
Files shown: components/dream-roadbook.tsx, docs/design/scenic-render-skill.md
Command/result: npm run lint && npm run build
Voiceover note: "为了让录屏更顺，我把示例图做成一键触发：点照片，Agent 自动读图并生成建模蓝图。"
Usable for: visual pipeline demo, product polish clip

## Phase A: Quality Gate

Date: 2026-06-06
Clip title: Phase A: Quality Gate
What changed: Added a Vitest unit-test pass over the deterministic lib helpers (dream-design-skill, geo, json-extract, MiniMax config, roadbook normalize and roadbook validation), a Playwright e2e harness with smoke specs for /, /studio and /dream, a GitHub Actions CI workflow plus Dependabot, Next.js error.tsx files for the root, /dream and /studio segments paired with a class-based components/error-boundary.tsx, and Zod field-level error reporting on the three roadbook API routes.
Why this matters: This is the foundation that makes every later Vibe Coding change safe. The next batch of work (Phase B neon-city template, Phase C real terrain pipeline) will lean on this CI to catch regressions, on the error boundaries to keep the recording recoverable, and on the Zod field errors to make product issues debuggable from the browser console.
Files shown: vitest.config.ts, playwright.config.ts, .github/workflows/ci.yml, .github/dependabot.yml, app/error.tsx, app/dream/error.tsx, app/studio/error.tsx, components/error-boundary.tsx, lib/roadbook-validation.ts, lib/roadbook-types.ts, app/api/generate-roadbook/route.ts, app/api/generate-dream-preview/route.ts, app/api/generate-scenic-render-design/route.ts, lib/*.test.ts, e2e/*.spec.ts
Command/result: npm run lint && npm run test:run && npm run build && npm run e2e
Voiceover note: "Phase A 不是给用户看的新功能，是给后面所有功能兜底的质量门：测试、CI、错误边界、Zod 字段错误。跑通这一关，后面写 /dream 新模板才敢放手改。"
Usable for: Vibe Coding process clip, AI engineering workflow clip, long-video mid-section showing "how I set up the guardrails before feature work"

## Phase B + C: neon-city template and real terrain scaffolding

Date: 2026-06-06
Clip title: Phase B + C: neon-city template and real terrain scaffolding
What changed: Added a fourth dream mood ("neon") and a fifth template ("neon-city") wired through dream-design-skill, buildVisualStyle, and the three.js DreamSkylineScene renderer, plus the Phase C real terrain scaffolding: tile-coords math, terrain and buildings Source interfaces with procedural/stub implementations, a RealSkylineScene component that degrades to a placeholder when no real data is available, and updated docs for both efforts.
Why this matters: The neon-city template gives /dream a fifth visually distinct preset (cyberpunk megacity, holographic billboards, rain-slick streets) that reuses the same data pipeline, while the Phase C scaffolding isolates tile math and source data behind small interfaces so the next iteration can swap in real terrain/buildings without touching the renderer. Together they show how to grow a visual product in two parallel tracks — more templates in the existing branch, and a credible path to real geography in a new one.
Files shown: lib/dream-design-skill.ts, lib/preview-asset.ts, components/dream-skyline-scene.tsx, components/dream-roadbook.tsx, lib/dream-design-skill.test.ts, docs/design/dream-design-skill.md, docs/design/scenic-render-skill.md, lib/tile-coords.ts, lib/tile-coords.test.ts, lib/terrain-source.ts, lib/terrain-source.test.ts, lib/buildings-source.ts, lib/buildings-source.test.ts, components/real-skyline-scene.tsx, docs/design/real-scenic-preview-roadmap.md
Command/result: npm run lint && npm run test:run && npm run build
Voiceover note: "Phase B 是在原有梦境地图上再加一格：霓虹都市，赛博朋克味。Phase C 是把'真地形'这件事拆成可替换的积木：坐标换算、地形源、建筑源、组件兜底。下次录屏就可以拿真大理来跑这条管线了。"
Usable for: visual variety demo, Vibe Coding refactor clip, "growing a project in parallel tracks" mid-section, real terrain pipeline preview

## Phase D: real data sources + dream-roadbook wiring

Date: 2026-06-07
Clip title: Phase D: swap the stubs for real Mapbox + Overpass clients
What changed: Replaced the Phase C procedural terrain and buildings stubs with real implementations: lib/mapbox-terrain-source.ts fetches Mapbox terrain-rgb tiles and decodes the packed elevation encoding, lib/overpass-buildings-source.ts queries the OpenStreetMap Overpass API for building footprints in a center+radius bbox, both behind the same source interfaces introduced in Phase C. /dream gets a new "真实地形管线" opt-in toggle in the right-side panel that mounts RealSkylineScene with these real sources; without MAPBOX_TOKEN or with the toggle off, the existing procedural DreamSkylineScene continues to render unchanged. New Vitest suites cover the real sources with mocked fetch, and the README documents the env vars and the fallback behavior.
Why this matters: Phase D is the moment the abstract Phase C scaffolding becomes a real product path. The /dream toggle lets a recording show real Dali terrain in one click without breaking the procedural fallback for viewers who never set a Mapbox token. Swapping the sources was a one-interface-change job, which is the design payoff of having isolated tile math and source abstractions in Phase C.
Files shown: lib/mapbox-terrain-source.ts, lib/mapbox-terrain-source.test.ts, lib/overpass-buildings-source.ts, lib/overpass-buildings-source.test.ts, components/dream-roadbook.tsx, .env.local.example, README.md, docs/recording/dev-log.md
Command/result: npm run lint && npm run test:run && npm run build
Voiceover note: "Phase D 把 Phase C 留的接口填上真数据：Mapbox 的 terrain-rgb、Overpass 的建筑轮廓。/dream 多了一个开关，开了就是真大理，关了还是原来的梦境地图。这条切换路径现在完全靠测试和接口保证，录屏时再也不用担心换数据会把流程跑崩。"
Usable for: real-scenic preview demo, "how to grow a visual product in isolated layers" mid-section, Vibe Coding refactor payoff clip, Phase D release-notes clip

## Phase E: v0.4.0 — Real Render + Data Source Expansion + Recording

Date: 2026-06-07
Clip title: Phase E: v0.4.0 — Real Render + Data Source Expansion + Recording
What changed: Rewrote components/real-skyline-scene.tsx to project real terrain-rgb heightmaps onto a PlaneGeometry and extrude real building footprints into meshes (the Phase C/D placeholder geometry is gone). Added three new sources that sit behind the same Phase C interfaces: lib/maptiler-terrain-source.ts (MapTiler terrain-rgb, reusing the decodeTerrainRgb helper), lib/gaode-buildings-source.ts (高德 3D, picking AMAP_KEY or GAODE_KEY), and lib/composite-buildings-source.ts (fan-out merger that dedupes by id and swallows per-source errors). Added lib/recording-helper.ts as a small state machine that auto-cycles the five /dream templates on a fixed interval, wired it into components/dream-roadbook.tsx as a '开始录制' toggle in the right-side panel, and added e2e/recording.spec.ts to drive it from Playwright. Unit tests for the new sources use mocked fetch / decoder; the manual / tokenless fallback path is preserved.
Why this matters: v0.4.0 is the first LilyTravelAgent release that does not have to choose between 'real geography' and 'recording ready'. The three pillars (real render, more sources, recording) all sit behind interfaces that the existing renderer and tests already trust, so the procedural fallback still works for anyone without tokens. The recording toggle is the camera-ready demo surface for this release, and the e2e spec locks it down so future refactors cannot silently break the auto-cycle.
Files shown: components/real-skyline-scene.tsx, lib/maptiler-terrain-source.ts, lib/maptiler-terrain-source.test.ts, lib/gaode-buildings-source.ts, lib/gaode-buildings-source.test.ts, lib/composite-buildings-source.ts, lib/composite-buildings-source.test.ts, lib/recording-helper.ts, lib/recording-helper.test.ts, components/dream-roadbook.tsx, e2e/recording.spec.ts, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run lint && npm run test:run && npm run build && npm run e2e
Voiceover note: 'v0.4.0 我把三件事一起做：把之前占位的 real-skyline-scene 换成真地形+真建筑，又加了 MapTiler / 高德 / 复合源三条新数据线，最后还接了录制模式——/dream 现在能一键自动巡演五个模板，录屏时点一下录制徽章就行。整条链路还是走 Phase C/D 那套接口，没设 token 的用户依然能看程序化回退。'
Usable for: v0.4.0 release clip, 'three pillars in one release' highlight, real-render demo, auto-cycle recording demo, Vibe Coding 'interface-first growth' follow-up clip

## Phase F: v0.5.0 — 高德 3D 建筑全量

Date: 2026-06-07
Clip title: Phase F: v0.5.0 — 高德 3D 建筑全量
What changed: Shipped a focused upgrade on the buildings pipeline without touching the terrain path. Added lib/building-height-estimator.ts — a type- and tag-driven heuristic estimator (residential/commercial/public/landmark tiers, plus OSM building:levels fallback) that fills in missing heights for both Overpass and 高德 features. Upgraded lib/gaode-buildings-source.ts to request extensions=all on the 高德 3D endpoint and parse the richer payload: layer count, root/floor material, name, type, address, area. Added lib/gaode-3d-buildings-source.ts — a new high-fidelity source that fans out across multiple type-code strategies (residential, commercial, public, landmarks) and reconciles them into one FeatureCollection, with per-strategy graceful failure. Reopened lib/composite-buildings-source.ts so the merger now picks the tallest, highest-fidelity feature on id collisions using estimated height and footprint area. Wired a small dev overlay into components/real-skyline-scene.tsx that surfaces the active height source, resolved feature count, and the share that came from the estimator. Phase F section in docs/design/real-scenic-preview-roadmap.md + README.md reflect the new release. Unit tests cover the estimator, the extensions=all upgrade, the multi-strategy source, and the height-aware composite dedupe.
Why this matters: v0.5.0 closes the loop on a real criticism of v0.4.0: buildings without explicit height data used to default to a flat 3m extrusion, which made any skyline look like a pancake when a region relied on Overpass. The estimator + multi-strategy source + height-aware composite mean the renderer now always has a defensible height for every building, and the dev overlay proves it on screen. Because everything sits behind the Phase C BuildingsSource interface, /dream's recording path, the procedural fallback, and the e2e spec all continue to work unchanged.
Files shown: lib/building-height-estimator.ts, lib/building-height-estimator.test.ts, lib/gaode-buildings-source.ts, lib/gaode-buildings-source.test.ts, lib/gaode-3d-buildings-source.ts, lib/gaode-3d-buildings-source.test.ts, lib/composite-buildings-source.ts, lib/composite-buildings-source.test.ts, components/real-skyline-scene.tsx, docs/design/real-scenic-preview-roadmap.md, README.md, docs/recording/dev-log.md
Command/result: npm run lint && npm run test:run && npm run build
Voiceover note: "v0.5.0 把建筑这条线彻底打通：先给所有没有 height 的楼做一层合理的启发式估计，再让高德走 extensions=all 把图层/材质/名称都拿回来，最后用一个高保真多策略源去补漏。复合源挑最高的留下，组件角落有一个小调试条告诉你哪些楼是估出来的、哪些是真给的。地形没动，但建筑的'天际线感'比 v0.4.0 厚实了一档。"
Usable for: v0.5.0 release clip, 'estimator as a missing-data bridge' highlight, multi-strategy source demo, height-aware composite demo, "interface-first growth keeps working at v0.5.0" follow-up clip
