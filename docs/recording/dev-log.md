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
