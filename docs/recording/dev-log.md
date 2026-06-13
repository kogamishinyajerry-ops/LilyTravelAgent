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

## Phase G: v0.6.0 — Visual Templates (Island, Shrine, Desert)

Date: 2026-06-07
Clip title: Phase G: v0.6.0 — Visual Templates (Island, Shrine, Desert)
What changed: Grew the /dream template catalog from 5 to 8 by adding island, shrine, and desert. lib/dream-design-skill.ts now exports DreamTemplate = "monument" | "starlake" | "lantern" | "snowfield" | "neon-city" | "island" | "shrine" | "desert" with matching dreamTemplates entries (漂浮岛屿 / 清冷神殿 / 大漠孤烟, Chinese notes and Chinese generation hints). components/dream-skyline-scene.tsx renders each new template: island = 8-14 floating box-islands with grass caps and wireframe edges 1-4m above the ground; shrine = a S-curved row of 6-10 stone lanterns (base, post, cap, tiny emissive flame) along the camera path; desert = dunes, oasis palms, and a caravan trail via the new createDesertSkyline / createDesertLandmark factories. Each template also gets a new landmark factory (createIslandLandmark, createShrineLandmark, createDesertLandmark) and a wrapper className hook (dream-skyline-island / -shrine / -desert) backed by matching radial-gradient + border rules in app/globals.css. lib/preview-asset.ts buildVisualStyle now branches on the new ids and emits floating-sky-islands / Japanese-shrine-path / sand-dunes wording, so the static prompt-only fallback renders the same mood. lib/dream-design-skill.test.ts bumps the template-count assertion to 8 and adds per-template describe blocks; new lib/preview-asset.test.ts covers buildCinematicPreviewPrompt + buildPromptOnlyPreviewAsset for the three new templates; lib/recording-helper.test.ts swaps a hard-coded 5 for ALL_TEMPLATES.length so the auto-cycle wrap test keeps working as the catalog grows. docs/design/dream-design-skill.md now lists the three new templates with visual signature, mood pairing, when-to-use, and implementation notes.
Why this matters: v0.6.0 triples the visual variety of /dream beyond the cyberpunk slot that v0.4.0 added. Island, shrine, and desert give the recording path three new aesthetically distinct presets (tropical / ceremonial / arid) that the auto-cycle in /dream can now walk through, and they each pair with a different mood in buildVisualStyle so the cinematic preview prompt matches the 3D scene. The change is fully contained: the Phase C/D interfaces, the recording controller, the procedural fallback, and the e2e spec are all untouched, so the existing v0.5.0 quality gate (lint / test / build / e2e) keeps passing.
Files shown: lib/dream-design-skill.ts, components/dream-skyline-scene.tsx, app/globals.css, lib/preview-asset.ts, lib/dream-design-skill.test.ts, lib/preview-asset.test.ts, lib/recording-helper.test.ts, docs/design/dream-design-skill.md, docs/recording/dev-log.md
Command/result: npm run lint && npm run test:run && npm run build
Voiceover note: "v0.6.0 我把梦境地图的模板从 5 个加到 8 个：漂浮岛屿、清冷神殿、大漠孤烟。/dream 的三 D 场景和静态预览都跟着改了，录屏一键巡演现在能看到三种全新的视觉风格——热带浮岛、鸟居石灯、沙丘驼影。Phase C/D 的接口没动，质量门继续走 lint/test/build 全绿。"
Usable for: v0.6.0 release clip, "visual variety grows without touching interfaces" highlight, recording auto-cycle demo with 8 templates, Vibe Coding "add a preset, don't refactor the engine" follow-up clip

## Phase H: v0.7.0 — AI Landmark Preset (M3 + Scenic Render Skill)

Date: 2026-06-07
Clip title: Phase H: v0.7.0 — AI Landmark Preset (M3 + Scenic Render Skill)
What changed: Introduced a data-driven AI landmark pipeline that lets /dream generate bespoke landmarks from a natural-language prompt. lib/landmark-preset.ts defines a Zod-validated LandmarkPreset contract (primitives, transforms, lights, material hints, scene hints) that is the single source of truth for both AI and procedural landmarks. lib/landmark-preset-fallbacks.ts ships 8 hand-crafted fallbacks (e.g. 鸟居 / 灯塔 / 沙丘营地 / 极光塔) so the UI works fully offline and during M3 outages. lib/landmark-renderer.ts is a generic preset -> Three.js mesh renderer (renderLandmarkPreset, renderLandmarkLight, countPresetsPrimitives) that replaces per-template landmark branches in components/dream-skyline-scene.tsx with a single data-driven path. lib/landmark-generator.ts wraps the M3 model behind a fetch-mocked interface, with a file-based preset cache at lib/landmark-preset-cache.ts keyed by prompt signature for deterministic repeat renders. app/api/generate-landmark-preset/route.ts is the Next.js route that fronts the generator. components/dream-roadbook.tsx surfaces an 'AI 地标' button that calls the route and pipes the result into DreamSkylineScene. docs/design/scenic-render-skill.md, docs/design/real-scenic-preview-roadmap.md, and README.md are updated to document the v0.7.0 surface.
Why this matters: v0.7.0 turns the landmark slot in /dream from a fixed catalog into an LLM-shaped primitive. Users can now ask for "a neon torii gate on a foggy hill" or "an ice lighthouse over the sea" and get a Zod-validated, renderable preset back — with the 8 procedural fallbacks guaranteeing the UI never breaks when M3 is unavailable. Because every preset flows through lib/landmark-renderer, no per-template Three.js code is needed for AI output, so the catalog can grow without touching the renderer. The Phase C/D interfaces, the recording auto-cycle, the e2e spec, and the v0.6.0 quality gate (lint / test / build) all keep passing unchanged.
Files shown: lib/landmark-preset.ts, lib/landmark-preset-fallbacks.ts, lib/landmark-preset-fallbacks.test.ts, lib/landmark-renderer.ts, lib/landmark-renderer.test.ts, lib/landmark-generator.ts, lib/landmark-generator.test.ts, lib/landmark-preset-cache.ts, lib/landmark-preset-cache.test.ts, lib/landmark-preset-coverage.test.ts, app/api/generate-landmark-preset/route.ts, components/dream-skyline-scene.tsx, components/dream-roadbook.tsx, docs/design/scenic-render-skill.md, docs/design/real-scenic-preview-roadmap.md, README.md, docs/recording/dev-log.md
Command/result: npm run lint && npm run test:run && npm run build
Voiceover note: "v0.7.0 把 /dream 的地标从写死的模板变成了 LLM 原语：M3 拿到中文/英文描述，吐回一个 Zod 校验过的 LandmarkPreset，三 D 场景用通用 renderer 直接拼出来；8 个程序化兜底保证没网也能玩。Phase C/D 接口没动，质量门继续全绿。"
Usable for: v0.7.0 release clip, "data-driven landmark from a prompt" highlight, M3 + Scenic Render Skill integration demo, Vibe Coding "LLM-shaped primitives behind a stable contract" follow-up clip

## Phase I: v0.8.0 — M3 Stability + Error UX

Date: 2026-06-07
Clip title: Phase I: v0.8.0 — M3 Stability + Error UX
What changed: Hardened every M3 call in LilyTravelAgent behind a single reliability layer and replaced the bare English error strings in the UI with a localized, actionable error surface. lib/retry-policy.ts is a small, framework-agnostic helper that computes exponential backoff (base x 2^(attempt-1)) with jitter, capped at maxDelayMs, and only retries failures whose M3ErrorCategory is in an allowlist (network / timeout / rate_limit / server). lib/m3-error-classifier.ts turns fetch errors, HTTP statuses, and JSON parse failures into a stable M3ErrorCategory union (network, timeout, rate_limit, server, auth, parse, schema, invalid_request, unknown) plus a retryable hint. lib/m3-client.ts wraps globalThis.fetch with an AbortController, a timeout (default 60s), and the retry policy, exposing a single callM3Chat entry point that callers in /dream, /api/generate-roadbook, /api/generate-dream-preview, /api/generate-scenic-render-design, and lib/landmark-generator.ts all funnel through. lib/error-ux.ts maps an M3Error onto Chinese titles / messages / actions and a fallback-notice predicate. components/error-ux.tsx ships ErrorStateBanner (block + inline) and ErrorStateChip, both tested with @testing-library/react; the banner renders a '重试' button only when the category is retryable, and the chip shows the category label inline. components/dream-roadbook.tsx (AI landmark panel) and components/travel-agent-app.tsx (roadbook generator) now store an M3Error instead of a raw string, render the new banner, and rewire the retry callback to re-invoke the existing handler. lib/roadbook-types.ts adds an optional category field to every error response variant. New CSS hooks in app/globals.css (lily-error-banner, lily-error-chip) round out the look. README.md + docs/design/real-scenic-preview-roadmap.md get a Phase I section. Stability tests under lib/*.stability.test.ts lock in the retry + classifier contract with 10+ cases each.
Why this matters: v0.8.0 is the first LilyTravelAgent release that treats M3 failures as a first-class UX concern rather than a console warning. Users now see a Chinese description of what went wrong, a '重试' button for transient issues, and a '已回退到程序化资产' chip whenever the renderer has degraded to a procedural fallback — the failure path is visible during recording just as much as in real use. Centralizing retry / timeout / classification in lib/m3-client.ts means the four M3 call sites cannot drift out of sync again, and the new stability test suites catch regressions in the retry loop or the category allowlist before they reach /dream. The Phase C/D interfaces, the recording auto-cycle, the e2e spec, and the v0.7.0 quality gate (lint / test / build) all keep passing unchanged.
Files shown: lib/retry-policy.ts, lib/retry-policy.test.ts, lib/retry-policy.stability.test.ts, lib/m3-client.ts, lib/m3-client.test.ts, lib/m3-client.stability.test.ts, lib/m3-error-classifier.ts, lib/m3-error-classifier.test.ts, lib/error-ux.ts, lib/error-ux.test.ts, components/error-ux.tsx, components/error-ux.test.tsx, app/api/generate-roadbook/route.ts, app/api/generate-dream-preview/route.ts, app/api/generate-scenic-render-design/route.ts, lib/landmark-generator.ts, lib/landmark-generator.test.ts, lib/roadbook-types.ts, components/dream-roadbook.tsx, components/travel-agent-app.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run lint && npm run test:run && npm run build
Voiceover note: "v0.8.0 我把所有调 M3 的地方都收口到 lib/m3-client：超时、取消、重试、错误分类都在一个地方，四个调用点（dream 三条路由 + landmark 生成器）再也不会写出不一样的重试逻辑。错误也终于不是英文堆栈了：lib/error-ux 给出中文提示和'重试'按钮，组件 error-ux 渲染横幅和'已回退'小标签——录屏时也能看到降级路径，真实用户也能知道下一步该干什么。Phase C/D 接口和 v0.7.0 的质量门都没动。"
Usable for: v0.8.0 release clip, "centralize M3 reliability in one client" highlight, retry-with-jitter + category allowlist demo, Chinese error UX + fallback chip demo, Vibe Coding "make failure paths visible, not silent" follow-up clip

## Phase K: v0.8.1 — UI Polish (Template Cards, Mood Swatches, Recording Ticker, AI Landmark Blueprint, Toast System)

Date: 2026-06-07
Clip title: Phase K: v0.8.1 — UI Polish (Template Cards, Mood Swatches, Recording Ticker, AI Landmark Blueprint, Toast System)
What changed: Polished the /dream experience and the roadbook flow with five focused UI refinements. components/template-card-grid.tsx replaces the template <select> with a four-up grid of per-template gradient cards (Chinese + English label, hover lift, stagger fade-in). The mood <button> row becomes a four-up color-swatch grid (one core / ring / soft triplet per DreamMood) driven by CSS custom properties. The Recording: D0/32 readout becomes a richer panel that surfaces a template ticker and a progress bar so the auto-cycle is visible at a glance. The AI landmark summary becomes a three-column blueprint card (icon + headline + 视觉要点 + 故事 on the left, tag stack on the right) with a per-source-tone accent for M3 vs fallback. A new global toast system (lib/toast.ts + components/toast-container.tsx mounted from app/layout.tsx) fires showInfo on submit, showSuccess on completion, and showError on failure for the roadbook flow. New CSS hooks in app/globals.css cover every new component: .lily-template-grid / .dream-template-card, .dream-mood-swatch / .dream-mood-swatch-chip, .dream-recording-panel / ticker, .dream-landmark-blueprint / .dream-landmark-blueprint-icon, and the .toast / .toast--variant stack. Tests for the toast system (lib/toast.test.ts, components/toast-container.test.tsx) and the template-card grid (components/template-card-grid.test.tsx + snapshot) ship alongside.
Why this matters: v0.8.1 makes the recording-time path visibly more polished. The template card grid and the mood swatch row make the /dream pickers self-describing so a viewer watching the recording can recognize the choice at a glance; the recording ticker + progress bar make the auto-cycle's progress observable rather than a vague D0/32; the AI landmark blueprint card communicates M3-vs-fallback at a glance via the source-tone border; and the global toast system gives the roadbook flow a self-describing success / error surface that survives even when the user is mid-scroll. Centralizing the toast manager as a singleton keeps the wiring trivial for any future call site, and the new component-level tests give us regression coverage on each of the five new pieces. The Phase C/D interfaces, the recording auto-cycle, the e2e spec, and the v0.8.0 quality gate (lint / test / build) all keep passing unchanged.
Files shown: components/template-card-grid.tsx, components/template-card-grid.test.tsx, components/__snapshots__/template-card-grid.test.tsx.snap, components/landmark-blueprint-card.tsx, components/landmark-blueprint-card.test.tsx, components/toast-container.tsx, components/toast-container.test.tsx, lib/toast.ts, lib/toast.test.ts, components/dream-roadbook.tsx, components/travel-agent-app.tsx, app/layout.tsx, app/globals.css, recording-shots/v3/01-home.png, recording-shots/v3/02-dream-with-new-template-cards.png, recording-shots/v3/03-dream-with-new-mood-swatches.png, recording-shots/v3/04-dream-with-recording-ticker.png, recording-shots/v3/05-dream-with-ai-landmark-blueprint.png, docs/recording/dev-log.md
Command/result: npm run lint && npm run test:run && npm run build
Voiceover note: "v0.8.1 是一次 UI 打磨：/dream 模板换成四宫格视觉卡，视觉气质换成色板芯片，录屏模式加了模板滚动条和进度条，AI 地标变成带'M3 / 兜底'色调的蓝图卡片，整个站又叠了一套右下角 Toast 通知——提交/成功/失败都有中文提示。每一片都有专门的组件测试和 globals.css 钩子，Phase C/D 接口和 v0.8.0 的质量门都没动。"
Usable for: v0.8.1 release clip, "polish without changing interfaces" highlight, side-by-side v2 vs v3 recording demo, Toast system demo with success / error / info variants, Vibe Coding "extract a component the moment its UI is recognizable" follow-up clip

## Phase L: v0.8.2 — UI Polish Round 2 (Layout, Empty States, A11y, Reduced Motion)

Date: 2026-06-07
Clip title: Phase L: v0.8.2 — UI Polish Round 2 (Layout, Empty States, A11y, Reduced Motion)
What changed: A second UI polish round on top of v0.8.1, focused on issues spotted in the v3-issue-spotting Playwright run. (1) **Layout & spacing** — widened the right-rail of the dream shell (230px / 0.76fr → 280px / 0.86fr) so the 4-column template grid + AI landmark panel breathe without cramping; standardized every right-rail section to 16px gap + 16px padding (.dream-detail, .dream-control, .dream-scenic-skill, .dream-landmark-skill, .dream-asset-panel); bumped the template card internal padding (10px 9px → 12px) and added text-overflow / ellipsis on the label and hint; capped the recording panel to 360px height with overflow-y auto so the 3D scene stays on-screen. (2) **Empty states & loading hints** — gave the AI landmark panel three explicit states (needs roadbook first, M3 generating with 3-10s Hourglass chip, AI landmark not generated yet with a '点击生成' recovery button) plus a brief-form shimmer skeleton (4 bars + role="status" aria-live="polite") and a fade-in keyframe so the layout does not shift when content arrives; the 生成 AI 地标 button is disabled when there is no roadbook and surfaces a title attribute explaining why. (3) **A11y** — added a global :focus-visible rule (2px gold ring with 2px offset) on every interactive element (a, button, input, textarea, select, [tabindex], [role="radio" / "switch" / "checkbox" / "menuitem" / "option"]); added a 跳到主要内容 skip-link as the first child of <body> (visually hidden until focused) targeting <main id="main-content" tabIndex={-1}> in dream-roadbook, travel-agent-app, and studio-mode; gave every template card a Chinese + English aria-label and title with a "（已选）" suffix on the active card; toast-dismiss buttons now describe the toast they are about to close ("关闭通知：可关闭"); recording-progress is wrapped in role="status" aria-live="polite" aria-atomic="true"; brief-form advertises aria-busy + .is-loading during generation; darkened --muted (#657066 → #5b6557) and --gold (#c9953d → #8f6018) so eyebrow / link / category labels clear WCAG AA (≥4.5:1) on the timeline bg, --paper, and #fff; added a 180ms color / transform transition on the recording step number so the value changes feel like a smooth tick. (4) **Reduced motion** — @media (prefers-reduced-motion: reduce) collapses every animation and transition to 0.01ms !important (scroll-behavior auto) so users who have requested reduced motion get the UI without the motion; 0.01s is the conventional a11y token — 0s would skip the animation event entirely and can break JS that listens for animationend. New e2e/dream.spec.ts responsive block runs /dream at three viewports (1280×800 / 820×1180 / 390×844), asserts #main-content is visible and there is no horizontal overflow, and writes per-viewport snapshots. New component tests in app/layout.test.tsx, components/dream-roadbook.test.tsx, and components/travel-agent-app.test.tsx pin down the user-facing a11y surface, the AI landmark empty-state, the brief-form skeleton, and the skip-link contract.
Why this matters: v0.8.2 takes the v0.8.1 polish and makes it durable: the layout breathes, the AI landmark panel now communicates three distinct states (instead of going silent), keyboard users get a single source of truth for focus indication + a skip link, and users with prefers-reduced-motion: reduce get the same UI without the motion. The new 11 HD PNGs in recording-shots/v3-live/ document every improvement visually (mobile breakpoint, template card hover, AI landmark pre-generate empty-state). The new e2e responsive block + the three new jsdom test files give us regression coverage on the a11y contract, the empty/loading states, and the skip-link target — so future UI changes that regress any of them are caught at the unit-test layer rather than at the recording-time visual review. The Phase C/D interfaces, the recording auto-cycle, and the v0.8.1 quality gate (lint / test / build) all keep passing unchanged.
Files shown: app/globals.css, app/layout.tsx, app/layout.test.tsx, components/dream-roadbook.tsx, components/dream-roadbook.test.tsx, components/travel-agent-app.tsx, components/travel-agent-app.test.tsx, components/studio-mode.tsx, components/template-card-grid.tsx, components/template-card-grid.test.tsx, components/__snapshots__/template-card-grid.test.tsx.snap, components/toast-container.tsx, components/toast-container.test.tsx, e2e/dream.spec.ts, recording-shots/v3-live/*.png, docs/recording/dev-log.md
Command/result: npm run lint && npm run test:run && npm run build
Voiceover note: "v0.8.2 是 UI 打磨的第二轮：先修了 v0.8.1 录屏里看到的几个小毛病——右侧轨道从 230px 放宽到 280px、所有右栏 section 统一 16px 间距和内边距、录屏面板封顶 360px 不再顶到 3D 场景外面；再给 AI 地标加了三个明确状态：需要先生成路书、M3 生成中（带 3-10s 提示）、未生成（带'点击生成'恢复按钮），路书生成表单也加了四根 shimmer 骨架。然后是 a11y：全局 2px 金色 :focus-visible 焦点环、跳到主要内容 skip-link、所有模板卡 / Toast 关闭按钮都有可读的中文 aria-label，recording 进度和 brief-form 都加上 aria-live / aria-busy；--muted 和 --gold 调暗一档让 AA 对比度全过。最后是 prefers-reduced-motion：所有动画压到 0.01ms，滚动行为也关掉。e2e 加了 1280/820/390 三个视口的响应式 smoke test，三个新 jsdom 文件把 a11y / empty / loading 的契约钉死。"
Usable for: v0.8.2 release clip, "polish round 2 — issue spotting → fixes" highlight, side-by-side v3.1 (v0.8.1) vs v3-live (v0.8.2) recording demo, mobile responsive demo, skip-link + focus ring demo, prefers-reduced-motion demo, Vibe Coding "every visible polish needs an a11y counterpart" follow-up clip

## Phase M: 5-Roadbook UI Demo (Kyoto / Iceland / Morocco / NYC / Dali)

Date: 2026-06-08
Clip title: Phase M: 5-Roadbook UI Demo (Kyoto / Iceland / Morocco / NYC / Dali)
What changed: Produced a self-contained, deterministic visual demo of the roadbook UI for five real cities — Kyoto (京都, 京都三日), Iceland (冰岛, 冰岛环岛), Morocco (摩洛哥, 摩洛哥彩绘), New York (纽约, 纽约五日), and Dali (大理, 大理古城) — using fixture-driven roadbook JSON. The driver `scripts/demo-5-roadbooks.js` posts each fixture to `/api/generate-roadbook` against a local dev server and saves a per-city `01-<city>.png` and four locator screenshots (title block, days/highlights, right rail, full page) to `recording-shots/roadbook-demo/`, plus an HTML gallery at `recording-shots/roadbook-demo/demo-gallery.html` that links all 25 PNGs in a five-column responsive grid with hover scale + Chinese eyebrow / city-name / mood captions. A `before-after/` subfolder captures the same five cities in the empty-state and freshly-generated states for a side-by-side comparison. The five mock JSONs in `scripts/demo-mocks/` (kyoto.json, iceland.json, morocco.json, newyork.json, dali.json) let the demo run with no M3 key / no network — the gallery still loads even with the dev server down because all assets are static PNGs. Total: 5 city hero shots + 20 locator shots + 1 gallery HTML + 5 mocks + 1 driver + 2 before/after subfolder shots per city = 36+ committed files.
Why this matters: Phase M is the first fully-reproducible, offline-safe visual deliverable in the project. The fixture-driven approach means the demo can be re-run from a clean checkout with `node scripts/demo-5-roadbooks.js` and the gallery can be opened in any browser — no `.env.local`, no M3 quota, no network. The five cities were chosen to span the DreamTemplate union: Kyoto (DEFAULT — historic / ancient capital), Iceland (ISLAND — natural / geological), Morocco (DESERT — arid / warm), New York (URBAN — neon / metropolitan), and Dali (CLASSIC / SHRINE-fallback — southern China hometown). The locator shots (title block, days/highlights, right rail, full page) make the per-city UI differences observable in the gallery without scrolling, and the two before/after shots make the post-generation visual jump clear. The gallery is the entry point for the "5 城真实路书" highlight clip and can be linked from the README and the website footer.
Files shown: scripts/demo-5-roadbooks.js, scripts/demo-mocks/{kyoto,iceland,morocco,newyork,dali}.json, recording-shots/roadbook-demo/{01-kyoto,02-iceland,03-morocco,04-newyork,05-dali}.png, recording-shots/roadbook-demo/{kyoto,iceland,morocco,newyork,dali}-{01-title-block,02-days-highlights,03-right-rail,04-fullpage}.png, recording-shots/roadbook-demo/{iceland,newyork,dali}-05-day2-hotspot.png, recording-shots/roadbook-demo/{iceland,newyork,dali}-06-day2-detail.png, recording-shots/roadbook-demo/before-after/*.png, recording-shots/roadbook-demo/demo-gallery.html, docs/recording/dev-log.md
Command/result: npm run lint && npm run test:run && npm run build
Voiceover note: "Phase M 把 5 份真实路书（京都 / 冰岛 / 摩洛哥 / 纽约 / 大理）变成了可重复、可离线的视觉 demo：5 个 mock JSON + 一个 Playwright 驱动脚本 + 25 张高清 PNG + 1 个 HTML gallery。fixture 驱动意味着不需要 M3 key 也能跑，画廊是 5 列响应式 grid，配中文 eyebrow / 城市名 / 情绪色 caption。这 5 个城市刚好覆盖 DreamTemplate 的五个分支：DEFAULT / ISLAND / DESERT / URBAN / CLASSIC-fallback，对照看模板差异非常直观。"
Usable for: "5 城真实路书" highlight clip, side-by-side template demo, README demo gallery embed, README "no API key needed" proof point, Phase C visual contract documentation, Phase M release clip

## Phase N: v0.8.3 — WebGL Render Quality Baseline

Date: 2026-06-13
Clip title: Phase N: v0.8.3 — WebGL Render Quality Baseline
What changed: Raised the visual quality floor of `/dream` without changing the agent workflow or roadbook schema. `components/dream-skyline-scene.tsx` now initializes WebGL with high-performance antialiasing, sRGB output, ACES filmic tone mapping, per-mood exposure, and soft shadow maps. The default 3D preview adds cinematic lighting, a background sun disc, layered haze planes, smoother terrain material, shadowed meshes, an animated `MeshPhysicalMaterial` water surface, and specular water ribbons. `app/globals.css` adds the compositing pass: brighter AI-image backdrop integration, light bloom, subtle vignette, and film-style overlays. `components/real-skyline-scene.tsx` gets renderer parity with the same color management, tone mapping, soft shadows, and smoother terrain/building materials so the real-terrain toggle does not regress to the old flat look. README and the real scenic preview roadmap now document the new rendering baseline and its product rationale.
Why this matters: This phase responds directly to the product-competitiveness problem: a travel roadbook agent cannot rely on rough toy geometry if its promise is "see the destination before you go." The change does not pretend to be photogrammetry or Unreal-level rendering; it establishes the first serious web-rendering baseline that future real terrain, landmark presets, AI backplates, and high-frequency destination assets must beat. It is also a good Vibe Coding learning clip because the upgrade is focused and reversible: improve the renderer, keep the existing agent workflow stable, then verify with lint/build and real browser screenshots.
Files shown: components/dream-skyline-scene.tsx, components/real-skyline-scene.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run lint && npm run build && Playwright desktop/mobile canvas pixel checks
Voiceover note: "这一段我先不换引擎，也不假装已经有真实景区模型。我先把网页端 Three.js 的基础质感拉起来：ACES 色调映射、软阴影、动态水面、雾气、镜头暗角。这样产品从'能跑的 3D demo'变成'有电影感的目的地预览'，后面再接真实地形和 AI 远景资产才有更高的比较基准。"
Usable for: product-quality critique response, "rough prototype to cinematic web preview" clip, Vibe Coding iteration lesson, Three.js render-quality baseline demo

## Phase O: v0.8.4 — Dali Cinematic Scene Preset

Date: 2026-06-13
Clip title: Phase O: v0.8.4 — Dali Cinematic Scene Preset
What changed: Added the first destination-specific visual asset layer for `/dream`. `lib/cinematic-scene-preset.ts` defines the Dali preset as structured data: Cangshan mountain bands, Erhai shoreline curves, four D1-D4 focus anchors, and labels for old town / Erhai / Xizhou village / return-day closure. `components/dream-skyline-scene.tsx` resolves that preset from roadbook text and mounts an extra Three.js layer only for Dali-related roadbooks: layered mountain silhouettes, shoreline glints, Bai courtyard blocks, an Erhai pier on the water day, and a day-specific focus beacon. `lib/cinematic-scene-preset.test.ts` verifies Dali matching, per-day focus switching, non-Dali rejection, and visible scene bounds. README and the scenic preview roadmap now document this as the first reusable high-fidelity destination asset layer.
Why this matters: v0.8.3 made the generic renderer prettier; v0.8.4 starts making the preview feel like a specific place. This is the bridge between a procedural demo and a real product advantage: popular destinations can get curated, testable scene presets while the Agent still generates the roadbook normally. The pattern is deliberately data-first so future Kyoto / Iceland / Morocco / New York presets can be added without rewriting the renderer.
Files shown: lib/cinematic-scene-preset.ts, lib/cinematic-scene-preset.test.ts, components/dream-skyline-scene.tsx, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/cinematic-scene-preset.test.ts && npm run lint && npm run build && Playwright desktop/mobile canvas pixel checks
Voiceover note: "上一轮我解决画质基线，这一轮开始解决像不像这个目的地。大理不再只是通用几何体了：我把苍山、洱海、白族院落和 D1-D4 当天焦点做成一个可测试的 scene preset。以后每个高频目的地都可以按这个方式扩展成自己的视觉资产。"
Usable for: "generic renderer to destination asset layer" clip, Dali-specific product demo, Vibe Coding data-first visual system lesson, 10-goal continuation round 1

## Phase P: v0.8.5 — Day-Director Camera

Date: 2026-06-13
Clip title: Phase P: v0.8.5 — Day-Director Camera
What changed: Added a small cinematic camera-direction layer on top of the Dali scene preset. `lib/cinematic-scene-preset.ts` now exports `buildCinematicCameraPose()`, which converts the active D1-D4 focus anchor into camera position, look-at target, FOV, and parallax weight. `components/dream-skyline-scene.tsx` initializes the Three.js camera from that pose and adds a subtle animated look-at drift, so day switching changes framing in addition to labels and geometry focus. `lib/cinematic-scene-preset.test.ts` now covers default camera pose, Erhai's wider water-day shot, and Xizhou's left-biased courtyard framing.
Why this matters: v0.8.4 made Dali visible as a specific place; v0.8.5 makes the roadbook feel directed. This is the first "shot grammar" layer: the Agent can eventually choose wide landscape, village close-up, old-town establishing shot, or skyline pan based on route content. It is intentionally pure-data and testable so future presets do not hardcode camera math directly inside the component.
Files shown: lib/cinematic-scene-preset.ts, lib/cinematic-scene-preset.test.ts, components/dream-skyline-scene.tsx, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/cinematic-scene-preset.test.ts && npm run lint && npm run build && Playwright desktop/mobile canvas pixel checks
Voiceover note: "现在我给大理 scene preset 加了一个导演层：D1 古城、D2 洱海、D3 喜洲，不只是按钮和文案变，camera position、lookAt、FOV 都会轻微变。动态路书不能只是地图，它要像一个目的地预告片。"
Usable for: "day switching as shot direction" clip, D1-D4 camera comparison, Vibe Coding pure-helper-first lesson, 10-goal continuation round 2

## Phase Q: v0.8.6 — Cinematic Route Rail

Date: 2026-06-13
Clip title: Phase Q: v0.8.6 — Cinematic Route Rail
What changed: Added a route-rail layer inside the Dali Three.js scene. `lib/cinematic-scene-preset.ts` now exports `buildCinematicRouteRail()`, which turns D1-D4 focus anchors into ordered world-space points plus an active-day index. `components/dream-skyline-scene.tsx` renders a soft full-route line, a brighter active-progress segment, and small glowing day anchors directly in the scene. `lib/cinematic-scene-preset.test.ts` verifies D1-D4 ordering, active-day detection, and unknown-day fallback.
Why this matters: The roadbook already had day buttons and a mini map, but the hero 3D world did not yet show the route. This change makes the itinerary spatial: the user sees the days as connected travel beats across Dali, not just disconnected UI cards. It also gives future destination presets a reusable route grammar.
Files shown: lib/cinematic-scene-preset.ts, lib/cinematic-scene-preset.test.ts, components/dream-skyline-scene.tsx, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/cinematic-scene-preset.test.ts && npm run lint && npm run build && Playwright D1-D4 canvas checks
Voiceover note: "这一轮我把路线从 UI 按钮搬进 3D 世界：大理 D1-D4 的焦点锚点会生成一条 route rail，全路线是淡线，当前已走到的段落更亮。用户看到的不只是四张卡，而是一条真的在场景里流动的旅行线。"
Usable for: route-in-3D demo, D1-D4 spatial itinerary clip, Vibe Coding helper-to-render pattern, 10-goal continuation round 3

## Phase R: v0.8.7 — Scene Preset Inspector

Date: 2026-06-13
Clip title: Phase R: v0.8.7 — Scene Preset Inspector
What changed: Added a transparent inspector layer for the destination-scene pipeline. `lib/cinematic-scene-preset.ts` now exports `buildCinematicSceneInspector()`, which turns the active roadbook/day into a compact summary: preset status, destination, hero label, shot label, visual cue, route progress, route point count, FOV, camera X, and parallax. `/dream` renders that payload in a new right-rail Scene Inspector under the mini map, so the viewer can see which destination preset is active and how D1-D4 are being directed. `lib/cinematic-scene-preset.test.ts` now covers the Dali active inspector, D3 route progress, and a generic fallback for unsupported destinations.
Why this matters: The previous three rounds added real scene mechanics, but they were mostly invisible unless you inspected the code. This round turns the visual pipeline into product UI. It helps debugging, helps users trust the generation, and gives recording footage a clear "Agent is directing the scene" explanation surface.
Files shown: lib/cinematic-scene-preset.ts, lib/cinematic-scene-preset.test.ts, components/dream-roadbook.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/cinematic-scene-preset.test.ts && npm run lint && npm run build && Playwright right-rail inspector checks
Voiceover note: "现在我把 3D 背后的 Agent 决策直接放进 UI：当前 destination preset 是什么，D2 镜头在拍洱海还是 D3 在拍喜洲，route rail 走到哪，FOV 和 parallax 是多少。这样用户看到的不是魔法效果，而是一条可解释的动态路书生成管线。"
Usable for: visible Agent pipeline clip, scene-inspector recording, D1-D4 shot breakdown, 10-goal continuation round 4

## Phase S: v0.8.8 — Day Landmark Silhouettes

Date: 2026-06-13
Clip title: Phase S: v0.8.8 — Day Landmark Silhouettes
What changed: Added a day-marker layer to the Dali cinematic preset. `lib/cinematic-scene-preset.ts` now exports `buildCinematicLandmarkSilhouettes()`, mapping D1-D4 to old-town gate, Erhai sail, Bai courtyard arch, and return-day cafe markers. `components/dream-skyline-scene.tsx` renders those markers as lightweight Three.js geometry inside the existing Dali preset layer; the active day is larger and brighter, while inactive markers stay as quiet route context. `lib/cinematic-scene-preset.test.ts` covers marker ordering, kind mapping, active-day emphasis, and unknown-day fallback.
Why this matters: The scene already had mountains, water, route rail, and camera direction, but day-level memory still needed stronger visual symbols. This round gives each day a quick-recognition marker without importing heavy 3D files, keeping the MVP fast while moving toward real destination preview language.
Files shown: lib/cinematic-scene-preset.ts, lib/cinematic-scene-preset.test.ts, components/dream-skyline-scene.tsx, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/cinematic-scene-preset.test.ts && npm run lint && npm run build && Playwright D1-D4 WebGL checks
Voiceover note: "这一轮我给 D1-D4 加了更有记忆点的地标剪影：古城门、洱海帆影、喜洲院落拱门、返程咖啡标记。重点不是一次性做复杂 3D，而是先建立一套可以被 Agent 调度的目的地视觉语汇。"
Usable for: D1-D4 landmark comparison clip, destination-specific visual language lesson, Vibe Coding data-to-geometry workflow, 10-goal continuation round 5

## Phase T: v0.8.9 — Day Atmosphere Director

Date: 2026-06-13
Clip title: Phase T: v0.8.9 — Day Atmosphere Director
What changed: Added a render-atmosphere director layer for the Dali scene. `lib/cinematic-scene-preset.ts` now exports `buildCinematicAtmosphereProfile()`, which maps the active D1-D4 focus into fog color/range, sun color/intensity/position, sun-disc placement, haze opacity, water color/opacity, tone-mapping exposure, and water-glint strength. `components/dream-skyline-scene.tsx` applies that profile to Three.js `Fog`, directional light, atmosphere planes, water material, and specular ribbons. `lib/cinematic-scene-preset.test.ts` verifies the generic fallback, brighter Erhai water day, calmer Xizhou morning, and warmer return-day hour.
Why this matters: The previous rounds made D1-D4 spatial and recognizable; this round makes them feel directed. D2 can become brighter and more reflective for Erhai, D3 can calm down for Xizhou, and D4 can warm up for the closing return beat. It is another small data-to-render step toward high-quality cinematic roadbooks.
Files shown: lib/cinematic-scene-preset.ts, lib/cinematic-scene-preset.test.ts, components/dream-skyline-scene.tsx, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/cinematic-scene-preset.test.ts && npm run lint && npm run build && Playwright D1-D4 atmosphere pixel checks
Voiceover note: "现在 D1-D4 不只是换地标和镜头，连光色、雾气、水面、高光也会跟着变。D2 洱海更亮，D3 喜洲更安静，D4 收尾更暖。这就是我想做的动态路书：不是卡片拼接，而是一个被 Agent 导演的目的地预览。"
Usable for: day-atmosphere comparison clip, render-direction lesson, Vibe Coding small-helper-to-visual-impact workflow, 10-goal continuation round 6

## Phase U: v0.8.10 — Scene-Aware Preview Image Prompt

Date: 2026-06-13
Clip title: Phase U: v0.8.10 — Scene-Aware Preview Image Prompt
What changed: Connected the Dali cinematic scene direction to the image-preview prompt. `lib/preview-asset.ts` now exports `buildCinematicScenePromptLine()`, which resolves the active scene preset and adds preset id, destination, hero label, active shot, visual cue, active landmark silhouette, atmosphere profile, water color, and sun color to the MiniMax image prompt. `lib/preview-asset.test.ts` verifies Dali D2 prompt alignment, D4 switching, and unsupported-destination fallback wording without calling image generation.
Why this matters: The Three.js scene and AI-generated far-view image now share one director layer. The roadbook's active day can drive both the interactive WebGL foreground and the generated cinematic backplate, making the asset pipeline more coherent and easier to explain in recordings.
Files shown: lib/preview-asset.ts, lib/preview-asset.test.ts, lib/cinematic-scene-preset.ts, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/preview-asset.test.ts && npm run lint && npm run build
Voiceover note: "这一轮我不是简单加 prompt 形容词，而是把前面做好的 3D 导演数据接进图片资产管线。D2 的 AI 远景图知道它是洱海 shot、帆影地标、erhai-sunset 氛围；D4 会自动变成 return-cafe 和 return-amber。"
Usable for: scene-data-to-image-prompt clip, asset pipeline explanation, Vibe Coding shared-data-layer lesson, 10-goal continuation round 7

## Phase V: v0.8.11 — Cinematic Micro-Motion Profile

Date: 2026-06-13
Clip title: Phase V: v0.8.11 — Cinematic Micro-Motion Profile
What changed: Added a micro-motion director layer for the Dali scene. `lib/cinematic-scene-preset.ts` now exports `buildCinematicMotionProfile()`, mapping the active D1-D4 focus into water speed/amplitude, haze drift, focus pulse, and active-landmark breathing. `components/dream-skyline-scene.tsx` collects named motion targets from the Three.js scene and applies the profile in the existing animation loop; water waves now read from the motion profile, atmosphere haze drifts, focus rings pulse, and the active landmark breathes subtly. `lib/cinematic-scene-preset.test.ts` verifies generic drift, stronger Erhai water motion, calmer Xizhou stillness, and return-day focus glow.
Why this matters: The product now feels more alive without turning into noisy animation. D2 Erhai glides more, D3 Xizhou stays calmer, and D4 return gets a warmer closing pulse. This is another data-driven director layer that makes the roadbook feel custom per day.
Files shown: lib/cinematic-scene-preset.ts, lib/cinematic-scene-preset.test.ts, components/dream-skyline-scene.tsx, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/cinematic-scene-preset.test.ts && npm run lint && npm run build && Playwright motion checksum check
Voiceover note: "我没有让页面为了动而动，而是给不同天数一个微动 profile。洱海的水更流动，喜洲更安静，返程日有一点焦点呼吸。这样动态路书开始有预告片感，但仍然很克制。"
Usable for: static-to-dynamic scene clip, micro-motion design lesson, Vibe Coding animation profile workflow, 10-goal continuation round 8

## Phase W: v0.8.12 — Local Dream Visual QA

Date: 2026-06-13
Clip title: Phase W: v0.8.12 — Local Dream Visual QA
What changed: Added a repeatable local visual QA command for `/dream`. `scripts/check-dream-visuals.mjs` opens the running `/dream` page, clicks D1-D4, verifies Scene Inspector text, checks WebGL canvas pixels, saves one screenshot per day, compares two D2 canvas checksums to confirm micro-motion is alive, writes `summary.json`, and generates a local `index.html` review gallery. `package.json` now exposes this as `npm run check:dream-visuals`. The output is written under `recordings/visual-checks/`, which is git-ignored for local review and recording prep.
Why this matters: The visual system now has enough moving parts that manual eyeballing is too weak. This gives every future visual iteration a deterministic review pack: screenshots, pixel evidence, motion evidence, console messages, and an HTML gallery. It also supports the user's content goal because each run produces material that can be used while explaining the development process.
Files shown: scripts/check-dream-visuals.mjs, package.json, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run check:dream-visuals && npm run lint && npm test && npm run build
Voiceover note: "做视觉产品时，我不想每次都凭感觉说'变好看了'。这个命令会自动点 D1-D4、截图、检查 WebGL 像素和微动，还会写 summary.json 和 HTML gallery。这样每次 Vibe Coding 迭代都有证据可以复盘。"
Usable for: visual-QA workflow clip, evidence-based design iteration lesson, recording prep workflow, 10-goal continuation round 9

## Phase X: v0.8.13 — Coastal Scene Preset Data Layer

Date: 2026-06-13
Clip title: Phase X: v0.8.13 — Coastal Scene Preset Data Layer
What changed: Added the second destination preset data layer. `lib/cinematic-scene-preset.ts` now exports `COASTAL_CINEMATIC_SCENE_PRESET`, covering lighthouse arrival, turquoise bay, harbor street, and sunset deck route beats. The scene preset id, focus anchor, landmark, atmosphere, and motion unions were generalized so the existing director helpers can resolve a non-Dali route without changing the roadbook schema. `lib/cinematic-scene-preset.test.ts` now verifies coastal preset matching, route progress, landmark mapping, atmosphere profiles, motion profiles, and Dali non-regression.
Why this matters: Dali proved the first cinematic route preset; this proves the system can grow into a preset catalog. The next step can render coastal-specific geometry, but this round keeps the change safely at the data/helper layer so the renderer does not become a large rewrite.
Files shown: lib/cinematic-scene-preset.ts, lib/cinematic-scene-preset.test.ts, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/cinematic-scene-preset.test.ts && npm run lint && npm run build
Voiceover note: "这一轮我把大理的一次性 preset 扩成多目的地数据层。海岸/海岛路书也能解析出灯塔、海湾、港口、日落观景台四个镜头，并且有自己的地标、氛围和微动 profile。"
Usable for: multi-destination preset catalog clip, data-layer scaling lesson, Vibe Coding small-safe-generalization workflow, continued goal run round 11

## Phase Y: v0.8.14 — Coastal Three.js Landmark Rendering

Date: 2026-06-13
Clip title: Phase Y: v0.8.14 — Coastal Three.js Landmark Rendering
What changed: Connected the coastal island / bay preset to the `/dream` Three.js renderer. `components/dream-skyline-scene.tsx` now branches cinematic preset geometry by preset id: Dali keeps the Bai courtyard and Dali landmark layer, while the coastal preset gets its own waterfront cluster with sandbars, water glints, harbor blocks, lighthouse, bay sail, harbor arcade, and sunset deck geometry. Existing route rail, focus beacon, atmosphere, motion, and Scene Inspector behavior are preserved.
Why this matters: The previous phase proved that coastal routes can be represented as data. This phase makes that data visible in the product. It is still lightweight procedural geometry, but it stops treating every non-Dali landmark as a Dali gate and gives future beach/skyline/mountain presets a clear rendering pattern.
Files shown: components/dream-skyline-scene.tsx, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run lint && npm test -- lib/cinematic-scene-preset.test.ts && npm test && npm run build && npm run check:dream-visuals
Voiceover note: "上一轮我把海岸路线做成数据 preset，这一轮把它真正接进 Three.js。D1 是灯塔，D2 是海湾帆影，D3 是港口拱廊，D4 是日落观景台。这样用户不是只看到文字换了，而是目的地视觉语汇也跟着变。"
Usable for: preset-data-to-render clip, coastal destination visual language lesson, Vibe Coding small-renderer-extension workflow, continued goal run round 12

## Phase Z: v0.8.15 — Local Demo Roadbook Switch

Date: 2026-06-13
Clip title: Phase Z: v0.8.15 — Local Demo Roadbook Switch
What changed: Added a recording-friendly demo switch to `/dream`. `lib/sample-roadbook.ts` now exports `coastalSampleRoadbook`, and `components/dream-roadbook.tsx` lets the user switch between Dali and coastal sample routes without calling MiniMax. The switch resets transient map, asset, scenic, and landmark state to keep the demo clean. `scripts/check-dream-visuals.mjs` now accepts `DREAM_DEMO=coast`, clicks the coastal demo, and verifies Scene Inspector before capturing D1-D4 screenshots. `components/dream-roadbook.test.tsx` covers the coastal switch.
Why this matters: Multi-destination visuals need stable demo material. This lets recording and visual QA show the coastal preset on demand without waiting for real generation, while the normal two-stage Agent generation flow stays unchanged.
Files shown: lib/sample-roadbook.ts, components/dream-roadbook.tsx, app/globals.css, scripts/check-dream-visuals.mjs, components/dream-roadbook.test.tsx, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/dream-roadbook.test.tsx lib/cinematic-scene-preset.test.ts && npm run lint && npm run check:dream-visuals && DREAM_DEMO=coast npm run check:dream-visuals && npm test && npm run build
Voiceover note: "我给 `/dream` 加了一个本地演示切换：不用重新调用 MiniMax，也可以从大理切到海岸样例。这样录屏时能稳定展示 preset catalog，自动视觉 QA 也能检查海岸这条路径。"
Usable for: recording-fixture workflow clip, visual-QA multi-destination clip, Vibe Coding demo-state discipline lesson, continued goal run round 13

## Phase AA: v0.8.16 — Studio Multi-Destination Demo Switch

Date: 2026-06-13
Clip title: Phase AA: v0.8.16 — Studio Multi-Destination Demo Switch
What changed: Added the same Dali/coastal local demo switching pattern to `/studio`. `components/studio-mode.tsx` now switches the 16:9 input panel, roadbook preview, top destination status, and local model label between Dali and coastal sample routes without calling any API. Live "现场生成" still clears demo highlighting and uses the existing generation/geocode flow. `components/studio-mode.test.tsx` covers the default Dali state and coastal switch.
Why this matters: `/dream` is the product surface, but `/studio` is the creator workflow surface. The user can now record a clean 16:9 chapter showing multi-destination behavior without waiting for a real generation, then switch back to live generation when needed.
Files shown: components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "`/dream` 是给用户看的动态路书，`/studio` 是我录开发过程和 Agent 工作流的画面。现在录屏台也能一键从大理切到海岸，输入区、预览区和状态条同步变化。"
Usable for: studio-recording workflow clip, content-production infrastructure clip, Vibe Coding demo-state reuse lesson, continued goal run round 14

## Phase AB: v0.8.17 — Scene Inspector Director Timeline

Date: 2026-06-13
Clip title: Phase AB: v0.8.17 — Scene Inspector Director Timeline
What changed: Added a D1-D4 cinematic director timeline inside `/dream` Scene Inspector. `lib/cinematic-scene-preset.ts` now exports `buildCinematicSceneTimeline()`, which returns the active preset's day labels, visual cues, landmark kinds, and active-day state. `components/dream-roadbook.tsx` renders those items as compact clickable director cards, so D1-D4 can be inspected or selected directly from the right rail.
Why this matters: Scene Inspector already explained the current shot; now it explains the whole visual plan. This makes the Agent's day-by-day rendering decisions visible, useful for debugging, trust, and recording.
Files shown: lib/cinematic-scene-preset.ts, lib/cinematic-scene-preset.test.ts, components/dream-roadbook.tsx, components/dream-roadbook.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/cinematic-scene-preset.test.ts components/dream-roadbook.test.tsx && npm run lint && DREAM_DEMO=coast npm run check:dream-visuals && npm test && npm run build
Voiceover note: "我把 Scene Inspector 从当前镜头信息升级成一条 D1-D4 导演轨道。现在你能直接看到 Agent 对每一天的视觉安排：灯塔、海湾、港口、日落观景台。"
Usable for: Agent director-timeline clip, visible planning layer explanation, Vibe Coding helper-to-UI workflow, continued goal run round 15

## Phase AC: v0.8.18 — Director Timeline Visual QA

Date: 2026-06-13
Clip title: Phase AC: v0.8.18 — Director Timeline Visual QA
What changed: Upgraded `scripts/check-dream-visuals.mjs` so visual QA now validates the Scene Inspector director timeline. The script extracts `.dream-scene-timeline`, asserts four D1-D4 items, checks active-day state, verifies expected preset labels for Dali and `DREAM_DEMO=coast`, stores timeline payloads in `summary.json`, and renders timeline cards in the local HTML gallery.
Why this matters: The visual QA no longer only proves the canvas is nonblank. It also proves the Agent's visible day-by-day director layer is present and correct, which protects the recording surface and product explanation layer during future visual polish.
Files shown: scripts/check-dream-visuals.mjs, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run check:dream-visuals && DREAM_DEMO=coast npm run check:dream-visuals && npm run lint && npm test && npm run build
Voiceover note: "我把自动视觉 QA 从画面亮不亮，升级到 Agent 的导演轨道有没有正确出现。现在 summary 和 gallery 会记录每一天的视觉 cue。"
Usable for: evidence-based visual QA clip, Agent planning verification lesson, recording-gallery workflow, continued goal run round 16

## Phase AD: v0.8.19 — Visual QA Clip Notes

Date: 2026-06-13
Clip title: Phase AD: v0.8.19 — Visual QA Clip Notes
What changed: `scripts/check-dream-visuals.mjs` now writes `clip-notes.md` into every local visual QA output folder. The notes summarize demo mode, target URL, route director line, screenshot filenames, D1-D4 visual cues, canvas checksums, motion evidence, and short voiceover prompts. Both Dali and `DREAM_DEMO=coast` runs generate recording notes.
Why this matters: The visual QA output now doubles as a content-production kit. After each product iteration, the user gets screenshots, a gallery, structured evidence, and a concise markdown outline for editing or later voiceover.
Files shown: scripts/check-dream-visuals.mjs, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run check:dream-visuals && DREAM_DEMO=coast npm run check:dream-visuals && npm run lint && npm test && npm run build
Voiceover note: "我把自动 QA 输出直接变成素材包：截图、HTML gallery、summary.json，再加一个 clip-notes.md。每次打磨产品，系统都会顺手整理这条视频该讲什么。"
Usable for: recording-kit workflow clip, QA-to-content pipeline lesson, Vibe Coding evidence archive workflow, continued goal run round 17

## Phase AE: v0.8.20 — Studio Visual QA Pack

Date: 2026-06-13
Clip title: Phase AE: v0.8.20 — Studio Visual QA Pack
What changed: Added `scripts/check-studio-visuals.mjs` and `npm run check:studio-visuals`. The script opens `/studio`, captures Dali and coastal local demo states at 1280x720, verifies destination input, roadbook preview title, active demo switch, and top status text, then writes `summary.json`, `index.html`, and `clip-notes.md` under `recordings/studio-checks/`.
Why this matters: `/studio` is the content-production workbench. This gives it the same repeatable evidence loop as `/dream`: screenshots, gallery, structured state, and recording notes.
Files shown: scripts/check-studio-visuals.mjs, package.json, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run check:studio-visuals && npm run lint && npm test && npm run build
Voiceover note: "我现在不只检查用户看到的 `/dream`，也检查我录教程用的 `/studio`。脚本会自动截大理和海岸两张 16:9 画面，并生成 clip-notes.md。"
Usable for: studio-QA workflow clip, recording workbench validation, Vibe Coding content-system lesson, continued goal run round 18

## Phase AF: v0.8.21 — Recording Asset Index

Date: 2026-06-13
Clip title: Phase AF: v0.8.21 — Recording Asset Index
What changed: Added `scripts/index-recording-assets.mjs` and `npm run index:recording-assets`. The command scans local `recordings/visual-checks` and `recordings/studio-checks` QA packs, then writes `recordings/index.html` and `recordings/clip-index.md` with links to each pack's gallery, summary, and clip notes when available.
Why this matters: The QA system now creates many useful timestamped folders. This index turns them into a lightweight local content archive so recent dream/studio evidence and recording notes are easy to find.
Files shown: scripts/index-recording-assets.mjs, package.json, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run index:recording-assets && npm run lint && npm test && npm run build
Voiceover note: "我现在每次 QA 都会产出素材包，所以又加了一个总索引命令。跑完以后，本地 recordings 目录会有一个 index.html 和 clip-index.md，快速找到最近的 dream/studio 图集和旁白 notes。"
Usable for: content archive workflow clip, QA-pack indexing lesson, Vibe Coding recording-material management, continued goal run round 19

## Phase AG: v0.8.22 — One-Command Recording QA Suite

Date: 2026-06-13
Clip title: Phase AG: v0.8.22 — One-Command Recording QA Suite
What changed: Added `scripts/check-recording-suite.mjs` and `npm run check:recording-suite`. The suite checks that `/dream` and `/studio` are reachable, then runs Dali `/dream` visual QA, coastal `/dream` visual QA, `/studio` recording QA, and recording asset indexing in sequence.
Why this matters: The product now has multiple useful QA/content commands. This suite turns them into one repeatable local workflow so each visual polish pass can produce fresh screenshots, galleries, clip notes, and a top-level recording index.
Files shown: scripts/check-recording-suite.mjs, package.json, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run check:recording-suite && npm run lint && npm test && npm run build
Voiceover note: "我把 `/dream` 大理、`/dream` 海岸、`/studio` 和素材索引串成一条 recording suite。以后每次产品打磨完，跑一条命令就能生成一批可剪辑素材。"
Usable for: one-command QA workflow clip, creator-asset pipeline lesson, Vibe Coding verification discipline, continued goal run round 20

## Phase AH: v0.8.23 — Studio Recording Asset Panel

Date: 2026-06-13
Clip title: Phase AH: v0.8.23 — Studio Recording Asset Panel
What changed: Added `lib/recording-assets.ts`, `/api/recording-assets`, and `/api/recording-assets/index`. `/studio` now reads local recording QA status and shows pack count, latest QA pack, and an "打开总索引" link inside Creator Track.
Why this matters: The asset pipeline is now visible in the recording workbench instead of only existing as terminal output and folders. This makes the Vibe Coding process easier to explain on screen.
Files shown: components/studio-mode.tsx, lib/recording-assets.ts, app/api/recording-assets/route.ts, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/recording-assets.test.ts components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我把素材管理入口接进 `/studio`。现在录屏台能直接显示本地已经有多少个 QA 素材包、最近一次生成是什么，并且能一键打开总索引。"
Usable for: asset-panel product clip, QA-to-content UI workflow, Vibe Coding process visibility, continued goal run round 21

## Phase AI: v0.8.24 — Studio Recording Asset Refresh

Date: 2026-06-13
Clip title: Phase AI: v0.8.24 — Studio Recording Asset Refresh
What changed: Added a refresh control to the `/studio` recording asset panel. The panel keeps the current asset summary visible while refreshing, shows the latest local read time, and updates pack count/latest pack after reading `/api/recording-assets` again.
Why this matters: The recording workflow now has a visible loop: run the QA suite, return to Studio, click refresh, and show that the local asset archive updated without a page reload.
Files shown: components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我给素材面板加了刷新。以后录屏时，我可以跑完 recording suite，回到 `/studio` 点一下刷新，素材包数量和最新记录会直接更新。"
Usable for: refresh-loop workflow clip, local asset archive UI lesson, Vibe Coding visible feedback loop, continued goal run round 22

## Phase AJ: v0.8.25 — Studio Recent Recording Packs

Date: 2026-06-13
Clip title: Phase AJ: v0.8.25 — Studio Recent Recording Packs
What changed: Extended the recording asset summary with `recentPacks` and rendered the three newest QA packs as a compact timeline inside `/studio` Creator Track. The list shows created time, pack title, and detail for each recent asset pack.
Why this matters: The asset panel now shows actual production history instead of only a count. This makes the recording-material pipeline easier to explain on screen.
Files shown: lib/recording-assets.ts, lib/recording-assets.test.ts, components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/recording-assets.test.ts components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我把素材面板从一个数字升级成最近 3 条素材时间线。每次 QA 产出的 dream、studio 包都会留在这里，录屏时能直接讲清楚素材是怎么积累出来的。"
Usable for: recording-asset timeline clip, QA evidence history explanation, Vibe Coding process archive, continued goal run round 23

## Phase AK: v0.8.26 — Recording Pack Type Badges

Date: 2026-06-13
Clip title: Phase AK: v0.8.26 — Recording Pack Type Badges
What changed: Added Dream QA / Studio QA badges to recent recording packs in `/studio`, with distinct visual accents for product-view evidence and creator-workbench evidence.
Why this matters: The local recording archive now communicates what kind of evidence each pack represents. This lowers the explanation cost during screen recording.
Files shown: components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我给最近素材包加了 Dream QA / Studio QA 标签。现在这条时间线能直接区分用户看到的梦境路书画面，和我录教程用的 Studio 工作台画面。"
Usable for: asset-type explanation clip, creator-workbench evidence taxonomy, Vibe Coding recording archive polish, continued goal run round 24

## Phase AL: v0.8.27 — Recording Pack Usage Hints

Date: 2026-06-13
Clip title: Phase AL: v0.8.27 — Recording Pack Usage Hints
What changed: Added usage hints to recent recording packs in `/studio`: Dream QA maps to "产品画面" and Studio QA maps to "讲解画面".
Why this matters: The recording archive now helps with editing decisions, not only QA status. The user can separate product-demo footage from process/tutorial footage at a glance.
Files shown: components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我给素材包加了用途提示：Dream QA 是产品画面，Studio QA 是讲解画面。这样素材一多起来，后面剪视频也不会乱。"
Usable for: editing-workflow clip, asset taxonomy polish, Vibe Coding content operations, continued goal run round 25

## Phase AM: v0.8.28 — Recording Index Label Parity

Date: 2026-06-13
Clip title: Phase AM: v0.8.28 — Recording Index Label Parity
What changed: Centralized recording pack type and usage mapping in `lib/recording-assets.ts`. `/studio` and `/api/recording-assets/index` now use the same Dream QA / Studio QA labels and product/walkthrough usage hints.
Why this matters: The compact Studio panel and full local recording index now use the same vocabulary, so the asset workflow feels coherent on screen.
Files shown: lib/recording-assets.ts, lib/recording-assets.test.ts, components/studio-mode.tsx, app/api/recording-assets/index/route.ts, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/recording-assets.test.ts components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我把 Studio 面板和总索引页的素材标签统一了。现在点进总索引，还是同一套 Dream QA / Studio QA 和产品画面 / 讲解画面逻辑。"
Usable for: local asset index polish clip, consistent information design lesson, Vibe Coding product coherence, continued goal run round 26

## Phase AN: v0.8.29 — Recording Index Missing-State Guidance

Date: 2026-06-13
Clip title: Phase AN: v0.8.29 — Recording Index Missing-State Guidance
What changed: Improved `/studio` recording asset empty state. If the local recording index is missing, the panel shows the exact command `npm run check:recording-suite`, hides the index link, and keeps refresh available.
Why this matters: Clean first-run and cache-cleared states are now explainable on screen. The creator does not need to remember the command while recording.
Files shown: components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我把空状态也做好了：没有本地素材索引时，Studio 直接告诉我跑哪条命令。跑完 recording suite，回来点刷新，就能看到素材包列表。"
Usable for: first-run workflow clip, local QA command guidance, Vibe Coding clean-state resilience, continued goal run round 27

## Phase AO: v0.8.30 — Recording Asset Type Counts

Date: 2026-06-13
Clip title: Phase AO: v0.8.30 — Recording Asset Type Counts
What changed: Added `countsByType` to the recording asset summary and displayed compact Dream/Studio pack counts in `/studio`.
Why this matters: The creator can now see whether the local archive is weighted toward product footage or walkthrough footage without opening the full index.
Files shown: lib/recording-assets.ts, lib/recording-assets.test.ts, components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- lib/recording-assets.test.ts components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我给素材库加了 Dream / Studio 数量统计。现在不只是知道有多少素材，还能看出产品画面和讲解画面的比例。"
Usable for: recording archive metrics clip, content operations dashboard polish, Vibe Coding visible progress metrics, continued goal run round 28

## Phase AP: v0.8.31 — Recording Index Type Counts

Date: 2026-06-13
Clip title: Phase AP: v0.8.31 — Recording Index Type Counts
What changed: Added total, Dream, and Studio pack counts to the `/api/recording-assets/index` header.
Why this matters: The full recording index now matches the compact `/studio` panel metrics, so the asset archive keeps one consistent mental model.
Files shown: app/api/recording-assets/index/route.ts, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm run lint && npm test && npm run build
Voiceover note: "我把总索引页也补上 Dream / Studio 数量统计。点开完整素材库后，看到的还是和 Studio 小面板一致的结构。"
Usable for: recording index metrics clip, information consistency polish, Vibe Coding asset archive UX, continued goal run round 29

## Phase AQ: v0.8.32 — Recording Asset Pipeline Guide

Date: 2026-06-13
Clip title: Phase AQ: v0.8.32 — Recording Asset Pipeline Guide
What changed: Added `docs/recording/recording-asset-pipeline.md`, a concise guide for the local workflow from `npm run check:recording-suite` to `/studio` refresh and `/api/recording-assets/index`.
Why this matters: The product work and content workflow are now documented as one repeatable creator loop. This gives future recording sessions a stable script.
Files shown: docs/recording/recording-asset-pipeline.md, README.md, docs/recording/dev-log.md
Command/result: npm run lint && npm test && npm run build
Voiceover note: "我把这套录屏素材管线单独写成文档：先跑 recording suite，再到 Studio 点刷新，再打开总索引。以后每一轮产品打磨都可以这样沉淀素材。"
Usable for: workflow recap clip, creator operations guide, Vibe Coding documentation habit, continued goal run round 30

## Phase AR: v0.8.33 — Studio Recording Script Mode

Date: 2026-06-13
Clip title: Phase AR: v0.8.33 — Studio Recording Script Mode
What changed: Added a `脚本模式` toggle to `/studio`. When enabled, Creator Track shows a compact three-step walkthrough: input requirements, generate the roadbook, and archive recording assets.
Why this matters: Studio now has a presenter mode for 16:9 capture. It keeps the creator focused on a repeatable explanation structure while preserving the existing input, roadbook, and asset panels.
Files shown: components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我给 Studio 加了脚本模式。录屏时点一下，右侧会出现输入、路书、素材三步讲解轨道，帮我把 Vibe Coding 的过程讲得更稳定。"
Usable for: studio-presenter-mode clip, tutorial-structure workflow, Vibe Coding walkthrough production, continued goal run round 31

## Phase AS: v0.8.34 — Studio Recording Command Copy

Date: 2026-06-13
Clip title: Phase AS: v0.8.34 — Studio Recording Command Copy
What changed: Added a `复制命令` action to the `/studio` recording asset panel. The action copies `npm run check:recording-suite`, shows an `已复制` button state, and keeps a manual-copy fallback if browser clipboard access is blocked.
Why this matters: The creator can now demonstrate the recording-suite loop directly from Studio: copy command, run QA, refresh assets, and open the local index. This makes the Vibe Coding production workflow easier to show on screen.
Files shown: components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我把 recording suite 命令做成 Studio 面板里的复制按钮。录屏时不需要背命令，直接点复制、跑 QA、回来刷新，素材管线就能讲完整。"
Usable for: command-copy workflow clip, local QA loop explanation, Vibe Coding production pipeline, continued goal run round 32

## Phase AT: v0.8.35 — Studio Recording Workflow Rail

Date: 2026-06-13
Clip title: Phase AT: v0.8.35 — Studio Recording Workflow Rail
What changed: Added a compact `录屏素材流程` rail to `/studio` with four visible steps: `复制命令`, `运行 QA`, `刷新素材`, and `打开索引`.
Why this matters: The recording asset panel now explains the full local QA-to-content loop instead of showing disconnected controls. This makes it easier to record a clear Vibe Coding workflow walkthrough.
Files shown: components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我把素材工作流做成四步：复制命令、运行 QA、刷新素材、打开索引。这样录屏时右侧面板自己就能讲清楚下一步。"
Usable for: workflow-rail clip, recording asset pipeline explanation, Vibe Coding visible process, continued goal run round 33

## Phase AU: v0.8.36 — Studio Recording Asset Readiness

Date: 2026-06-13
Clip title: Phase AU: v0.8.36 — Studio Recording Asset Readiness
What changed: Added a `录屏素材状态` badge to `/studio`. It shows `素材已准备` when the local index and asset packs exist, `素材待补充` when an empty index exists, and `等待生成索引` when the index is missing.
Why this matters: The recording asset panel now communicates readiness before the creator opens the index or reads the counts. This makes the local material pipeline easier to understand during silent screen capture.
Files shown: components/studio-mode.tsx, components/studio-mode.test.tsx, app/globals.css, README.md, docs/design/real-scenic-preview-roadmap.md, docs/recording/dev-log.md
Command/result: npm test -- components/studio-mode.test.tsx && npm run lint && npm test && npm run build
Voiceover note: "我给素材面板加了一个状态牌。以后录屏时，观众可以先看到素材是不是已经准备好，而不是只看一堆数字。"
Usable for: asset-readiness clip, QA pipeline status explanation, Vibe Coding recording workbench polish, continued goal run round 34
