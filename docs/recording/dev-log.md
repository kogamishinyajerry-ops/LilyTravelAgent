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
