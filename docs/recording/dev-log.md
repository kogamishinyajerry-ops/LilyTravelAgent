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
