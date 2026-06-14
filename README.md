# LilyTravelAgent

An AI travel-roadbook prototype for generating cinematic, recording-ready trip guides. LilyTravelAgent uses MiniMax for itinerary and visual-design generation, Amap for map coordinates, and a Three.js dream-roadbook interface for a more expressive pre-trip preview.

![LilyTravelAgent dream roadbook preview](docs/assets/lilytravelagent-dream-preview.png)

## What It Does

- Generates a customized Chinese travel roadbook from a short trip brief.
- Shows a `/dream` roadbook with minimal text, 2.5D terrain, day switching, a compact map, and asset controls.
- Upgrades the `/dream` WebGL layer with filmic tone mapping, soft shadows, animated water, atmospheric haze, and real-terrain renderer parity.
- Uses destination-specific cinematic scene presets, starting with Dali's Cangshan / Erhai / old-town layer and a coastal island / bay layer with rendered lighthouse, bay, harbor, and sunset-deck cues.
- Includes local `/dream` demo roadbook switches for Dali and coastal routes, so recording and QA can show multiple presets without calling MiniMax.
- Uses a two-stage Agent flow: fast preview first, then fuller travel details in the background.
- Turns uploaded or sample landscape photos into MiniMax-M3 render blueprints for cinematic destination previews.
- Caches generated preview assets locally, keeps history versions, and lets you mark a final cover.
- Includes `/studio`, recording docs, local Dali/coastal demo switches, and a one-click sample-photo library for Vibe Coding content creation.

## Demo Routes

- `/` - practical roadbook generator
- `/dream` - cinematic dream-roadbook prototype
- `/studio` - 16:9 recording mode
- `/share-preview` - final cover and roadbook share-card view

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment config:

```bash
cp .env.local.example .env.local
```

3. Fill these values in `.env.local`:

```bash
MINIMAX_API_KEY=your_minimax_key
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_FAST_MODEL=MiniMax-M2.7-highspeed
MINIMAX_QUALITY_MODEL=MiniMax-M3
MINIMAX_THINKING=disabled
MINIMAX_PREVIEW_MAX_COMPLETION_TOKENS=1800
MINIMAX_PREVIEW_TIMEOUT_MS=60000
MINIMAX_MAX_COMPLETION_TOKENS=5000
MINIMAX_TIMEOUT_MS=180000
MINIMAX_SCENIC_MODEL=MiniMax-M3
MINIMAX_SCENIC_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_SCENIC_PATH=text/chatcompletion_v2
MINIMAX_SCENIC_TIMEOUT_MS=120000
MINIMAX_SCENIC_MAX_COMPLETION_TOKENS=2200
MINIMAX_SCENIC_MAX_IMAGE_BYTES=6291456
MINIMAX_IMAGE_MODEL=image-01
MINIMAX_IMAGE_TIMEOUT_MS=120000
PREVIEW_ASSET_CACHE=on
AMAP_KEY=your_amap_web_service_key
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

Use `http://localhost:3000/studio` for the 16:9 recording mode.

`/studio` has local Dali/coastal demo switches for recording the same product story without waiting for live generation: the input panel, roadbook preview, and top status all update together while the real "现场生成" path remains available.

Use `http://localhost:3000/dream` for the generative dream-roadbook prototype with minimal text, Three.js terrain, and an optional MiniMax cinematic preview image layer. The default renderer uses ACES filmic tone mapping, soft shadows, animated water, atmospheric haze, and a composited AI-image backdrop so the fallback view still feels cinematic when image generation is unavailable.

For the default Dali roadbook, `/dream` also mounts a destination-specific cinematic scene preset from `lib/cinematic-scene-preset.ts`: layered Cangshan silhouettes, Erhai shoreline curves, Bai courtyard blocks, day-specific landmark silhouettes, day-directed atmosphere and motion, a focus marker, a world-space D1-D4 route rail, and a small day-director camera pose so D1-D4 change both the label and the framing. The same renderer now also supports a coastal island / bay preset with sea bands, sandbars, lighthouse arrival, turquoise bay sail, harbor arcade, and sunset-deck geometry. A compact Scene Inspector in the right rail exposes the active preset, shot cue, D1-D4 director timeline, route progress, and lens/parallax values for recording the Agent visual pipeline.

Use the local demo roadbook switch in the `/dream` control panel to move between the Dali and coastal sample routes without calling MiniMax. This is intended for recording and visual QA; the normal "生成梦境路书" button still runs the two-stage Agent generation flow. `/dream` also shows a Studio Bridge card with a recording-suite coverage badge that returns to the matching `/studio?demo=...` recording workbench.

Use `http://localhost:3000/share-preview` for the 16:9 post-cover recording card. `/dream` generates the query link automatically from the current roadbook and asset cache.

`/dream` uses two-stage generation: first a lightweight dream preview, then a background full-detail roadbook pass. After the preview roadbook is available, it also requests `/api/generate-preview-asset` to generate a 16:9 cinematic destination image; if image generation fails, the procedural Three.js scene remains as the fallback. The image prompt also receives the active cinematic scene direction when a destination preset is available, so the AI backplate can align with the same day focus, landmark, and atmosphere as the WebGL scene.

The `/dream` Scenic Render Skill panel lets you upload a local PNG/JPG/WebP landscape photo. `/api/generate-scenic-render-design` asks MiniMax-M3 to turn that photo into a structured render blueprint: terrain, architecture, water/vegetation, lighting, camera, materials, Three.js plan, and an image-generation prompt. When you regenerate the preview asset, that blueprint is added to the cinematic image prompt so the destination preview is more grounded in the uploaded scene.

For recording, `/dream` also includes a one-click real-photo sample library with Dali, coast, city skyline, and China alley examples. Clicking a sample loads it and automatically starts the MiniMax-M3 photo-to-render design step. The local files live in `public/sample-photos/`, with source attribution in `public/sample-photos/ATTRIBUTION.md`.

Preview images are cached locally under `.lily-cache/preview-assets` by default. The cache key includes destination, day count, visual style, model, prompt, and roadbook content, so repeating the same roadbook/style reads the saved image instead of calling image generation again.

The `/dream` right-side asset panel shows the current cache key, cache time, source, clear action, and force-regenerate action for recording the visual asset pipeline. Every successful real image generation is also saved into a local history drawer, so users can compare, restore, and mark a final roadbook cover without calling the image model again.

After a cover is locked, the share-preview card presents the final cover, roadbook title, four-day route, cache key, and asset status as a clean recording-ready handoff view.

## AI Landmark Preset (v0.7.0)

v0.7.0 adds AI-generated landmark presets via M3. Click "生成 AI 地标" in `/dream` to use M3-generated geometry, or rely on the 8 procedural fallbacks. The schema lives in `lib/landmark-preset.ts`; results are cached under `.lily-cache/landmark-presets/`.

### Error handling (v0.8.0)

v0.8.0 wraps every M3 call in `lib/m3-client.ts` with a centralized retry policy (3 attempts, exponential backoff with jitter) and `lib/m3-error-classifier.ts` to categorize failures into 8 types — `network` / `timeout` / `rate_limit` / `server` are retryable; `auth` / `parse` / `schema` / `invalid_request` are not. `components/error-ux.tsx` surfaces a Chinese error message, a "重试" button, and a fallback notice whenever a request degrades to procedural assets, so the failure path is visible during recording as well as in real use.

## Real Terrain Pipeline (Optional)

To enable real terrain in /dream: set MAPBOX_TOKEN in .env.local. The "真实地形管线" toggle in the /dream right panel will then fetch Mapbox terrain-rgb + OSM Overpass buildings. Without a token, the toggle falls back to the procedural Three.js scene. Both renderer paths share the same high-quality WebGL baseline: color-managed output, ACES tone mapping, high-performance antialiasing, and soft shadow maps.

v0.5.0 adds full 高德 3D building pipeline: extensions=all, multi-type-code queries, heuristic height estimation. Set `AMAP_KEY` in `.env.local`. The pipeline runs alongside the Mapbox/Overpass sources; missing tokens gracefully fall back to procedural buildings.

## Verification

```bash
npm run lint
npm test
npm run build
npm run check:dream-visuals
DREAM_DEMO=coast npm run check:dream-visuals
DREAM_LENS=low-skyline npm run check:dream-visuals
npm run check:dream-lenses
npm run check:studio-visuals
npm run check:studio-dream-handoff
npm run index:recording-assets
npm run check:recording-index
npm run check:recording-suite
```

`npm run check:dream-visuals` expects the local dev server to be running at `http://localhost:3000/dream` unless `DREAM_URL` is set. It writes D1-D4 screenshots, pure WebGL D1-D4 `*-scene.png` crops, `summary.json`, `index.html`, and `clip-notes.md` under `recordings/visual-checks/`, which is ignored by git and intended for recording/product review. The QA checks WebGL pixels, micro-motion, cinematic matte mounting, Scene Inspector text, Composition profile, Proof Stack readiness, the active Director Lens, and the D1-D4 director timeline. Set `DREAM_DEMO=coast` to make the script click the local coastal sample before running the same checks. Set `DREAM_LENS=low-skyline` or another Director Lens id to record a specific camera direction in the gallery and clip notes.

`npm run check:dream-lenses` runs the same `/dream` visual QA once per Director Lens and writes one local QA pack per lens under `recordings/visual-checks/`. Set `DREAM_LENSES=wide-water,low-skyline` to run a smaller subset.

`npm run check:studio-visuals` expects `http://localhost:3000/studio` unless `STUDIO_URL` is set. It captures the Dali and coastal 16:9 recording layouts, verifies the Studio proof playback, captures the Proof Story `脚本素材` card, verifies the Proof Story Handoff, Complete Bundle, Bundle Chain, and Proof Chain Summary copy states, records the Proof Story Complete strip, and writes `summary.json`, `index.html`, and `clip-notes.md` under `recordings/studio-checks/`.

`npm run check:studio-dream-handoff` expects `http://localhost:3000` unless `HANDOFF_BASE_URL` is set. It verifies both Dali and coastal round trips between `/studio?demo=...` and `/dream?demo=...`, then writes screenshots, `summary.json`, and `clip-notes.md` under `recordings/handoff-checks/`.

`npm run check:lens-candidate-handoff` expects `http://localhost:3000` unless `LENS_CANDIDATE_BASE_URL` is set. It verifies the Director Lens comparison dashboard candidate actions by clicking `Open first candidate`, the first candidate card, and one queue chip, then checking that `/dream` receives the expected candidate rank, day, and lens context.

`npm run index:recording-assets` scans local `recordings/visual-checks`, `recordings/studio-checks`, and `recordings/handoff-checks`, then writes `recordings/index.html` and `recordings/clip-index.md` as a local asset index. When Dream or Studio QA packs include playback proof evidence, the index also shows Dream Proof and Studio Proof cues plus links to playback screenshots, summaries, and notes. Studio packs with Proof Story script-material evidence also show a compact `Proof Story Production Assets` card in the HTML index and section in `clip-index.md`, grouping narration preview, closeout status, optional `Proof Story Complete` archive line, optional `Proof Story Complete Bundle` handoff line, optional `Proof Story Bundle Chain` video-notes line, optional `Proof Chain Summary` post-production note, script path, screenshot, and clip-notes links for editing.

`npm run check:recording-index` expects the local dev server to be running at `http://localhost:3000` unless `RECORDING_INDEX_BASE_URL` is set. It regenerates the local asset index, opens `/api/recording-assets/index`, verifies Dream Proof and Studio Proof text plus all six screenshot/summary/notes links, then writes a small proof pack under `recordings/index-checks/`. If the latest Studio QA pack contains Proof Story script-material evidence, it also verifies that the Production Assets card includes the script-material label, narration preview, closeout status, optional `Proof Story Complete` archive line, optional `Proof Story Complete Bundle` handoff line, optional `Proof Story Bundle Chain` video-notes line, optional `Proof Chain Summary` post-production note, cue text, and three evidence links as an optional `scriptMaterialCheck`; the generated `clip-notes.md` records compact `Production Assets QA`, `Proof Story Complete`, `Proof Story Complete Bundle`, `Proof Story Bundle Chain`, `Proof Chain Summary`, and `Proof Story Delivery` lines for that pass. If no local Dream or Studio proof pack exists yet, it exits with a clear skipped-precondition message and tells you to run `npm run check:recording-suite`.

`npm run check:recording-suite` expects the local dev server to be running at `http://localhost:3000`. It runs the Dali `/dream` visual QA, coastal `/dream` visual QA, Dali Director Lens QA for the four non-auto lens modes, `/studio` visual QA, Studio-Dream handoff QA, recording asset index generation, and Recording Index QA in sequence. It also writes `recordings/suite-runs/<stamp>/summary.json` and `clip-notes.md` as the top-level receipt for the full run. Set `RECORDING_SUITE_BASE_URL`, `DREAM_URL`, `STUDIO_URL`, `HANDOFF_BASE_URL`, or `RECORDING_INDEX_BASE_URL` to target another local server.

`/studio` reads `/api/recording-assets` and shows a recording asset readiness badge, the current local recording asset count, Dream/Studio/Bridge counts, product/walkthrough/bridge-validation edit tags, a latest QA pack summary card, recent QA packs with visually distinct Dream/Studio/Bridge badges and usage hints, a copyable recording-suite command, a compact copy/run/refresh/index/bridge-evidence workflow rail, a refresh control, an "打开总索引" link, and a "镜头对比" link. It also surfaces Dream Proof, Studio Proof, Candidate QA, Recording Index QA, and Recording Suite status cards with direct evidence links when those proof packs exist; the Recording Index QA card now includes `Index Chain 已验证` / pending and `Index Summary 已验证` / pending chips for the final video-notes proof chain and short post-production note. The index link opens `/api/recording-assets/index`, a local HTML overview with the same pack type, usage labels, and Dream/Studio/Bridge counts. The lens comparison link opens `/api/recording-assets/lens-comparison`, a local review dashboard that groups recent Dream QA packs by Director Lens and shows pure 3D D1-D4 thumbnails side-by-side. If the local index is missing, `/studio` shows the exact command: `npm run check:recording-suite`.

`/studio` also has a `脚本模式` toggle that adds a compact four-step creator talking track, a Bridge QA evidence status card, a current-shot cue with Bridge QA evidence, four series chapter chips, a Demo Bridge card, a visible recording-suite coverage badge, a script-mode proof checklist that mentions `Index Chain 已验证` and `Index Summary 已验证`, and a topbar "讲解轨道已打开" cue for 16:9 walkthrough recording. Its Proof Story `脚本素材` card now reads the latest Studio QA script-material capture and the optional Recording Index QA script-material check, links to both captured screenshots when available, shows a compact `Production Assets` chip for whether the HTML and clip indexes contain the Proof Story production-assets grouping, links to the latest `Production Assets QA` clip-notes receipt when ready, can copy that receipt path for editing notes, shows a copyable `Proof Story Delivery` line that combines closeout status, Production Assets readiness, and the QA receipt path, shows a `Delivery 已入库` / `Delivery 待入库` sync chip when the latest QA clip notes contain the same Delivery line, shows a copyable `Proof Story Handoff` line plus `Handoff 已复制` / `Handoff 待验证` QA chip for final video-planning notes, shows a compact `Proof Story Complete` strip that condenses Delivery, Handoff, and QA receipt readiness, shows a `Complete 已入库` / pending archive chip when the latest Studio QA notes contain the same Complete line, and shows an `Index Complete 已验证` / pending chip when Recording Index QA has verified the same Complete line. It also previews a copyable `Proof Story Complete Bundle` line for post-production handoff, shows a `Bundle 已入库` / pending chip when the latest Studio QA notes contain the same Bundle line and copy state, shows an `Index Bundle 已验证` / pending chip when Recording Index QA has verified the same Bundle line, adds a copyable `Proof Story Bundle Chain` closeout sentence for video notes, shows a `Chain 已入库` / pending chip when the latest Studio QA notes contain the same Chain line and copy state, shows an `Index Chain 已验证` / pending chip when Recording Index QA has verified the same Chain line, adds `复制 Proof Chain Summary` with `Summary 已入库` plus `Index Summary 已验证` chips for the short post-production note, and adds `复制最终交付摘要` to combine Chain, Summary, Recording Index QA, and Suite Run states into one final clip-notes sentence. It also shows a four-state closeout checklist for `脚本路径`, `Studio QA`, `索引入库`, and `Index QA`, previews the one-line closeout status, and can copy that status for clip notes. Its "梦境路书" link carries the selected local demo into `/dream` with `?demo=dali` or `?demo=coast`, and `/dream` returns to `/studio` with the same query, so the recording workbench and cinematic preview can hand off in both directions.

## Recording And Learning Assets

- `docs/recording/shot-list.md` breaks the build into screen-recording chapters.
- `docs/recording/video-outline.md` provides short-video and long-video structures.
- `docs/recording/dev-log.md` is the running production log for each clip.
- `docs/recording/recording-asset-pipeline.md` explains the local QA-to-recording-assets workflow.
- `docs/recording/goal-31-40-recap.md` summarizes the Studio presenter-mode and recording-asset workflow run.
- `docs/recording/goal-41-50-recap.md` summarizes the Studio-Dream bridge and recording-suite coverage run.
- `docs/recording/goal-51-60-recap.md` summarizes the Bridge QA evidence asset workflow run.
- `docs/recording/goal-61-70-recap.md` summarizes the `/dream` Cinematic Visual Contract and proof-stack run.
- `docs/recording/goal-71-100-recap.md` summarizes the Director Lens visual pipeline, QA evidence, and recording content run.
- `docs/recording/goal-101-110-recap.md` summarizes the all-lens visual capture and recording asset index run.
- `docs/recording/goal-111-120-recap.md` summarizes the first low-skyline 3D lens-tuning run.
- `docs/recording/goal-121-130-recap.md` summarizes the all-lens tuning cue pass and live visual QA evidence.
- `docs/recording/goal-131-140-recap.md` summarizes the Director Lens comparison dashboard and Dream handoff run.
- `docs/recording/goal-141-150-recap.md` summarizes the pure WebGL scene-crop QA and comparison dashboard upgrade.
- `docs/recording/goal-151-160-recap.md` summarizes the Dali 3D depth-staging render upgrade.
- `docs/recording/goal-161-170-recap.md` summarizes the Dali old-town gate and courtyard landmark-detail render pass.
- `docs/recording/goal-171-180-recap.md` summarizes the current-vs-previous Director Lens scene-crop review aid.
- `docs/recording/goal-181-190-recap.md` summarizes the explainable visual-diff badges for before/after scene crops.
- `docs/recording/goal-191-200-recap.md` summarizes the Best Recording Candidates strip for changed scene crops.
- `docs/recording/goal-201-210-recap.md` summarizes the candidate-to-Dream handoff cue and return path.
- `docs/recording/goal-211-220-recap.md` summarizes the lightweight recording queue handoff copy.
- `docs/recording/goal-221-230-recap.md` summarizes the interactive next-candidate link in `/dream`.
- `docs/recording/goal-231-240-recap.md` summarizes the final-candidate state for the lightweight recording queue.
- `docs/recording/goal-241-250-recap.md` summarizes the dashboard candidate primary action and visible queue chips.
- `docs/recording/goal-251-260-recap.md` summarizes the candidate thumbnail previews in the dashboard queue.
- `docs/recording/goal-261-270-recap.md` summarizes the candidate `Why:` badge and hover/focus state.
- `docs/recording/goal-271-280-recap.md` summarizes the candidate click-through QA check.
- `docs/recording/goal-281-290-recap.md` summarizes the Studio candidate QA status card.
- `docs/recording/goal-291-300-recap.md` summarizes the Studio candidate QA command rail.
- `docs/recording/goal-301-310-recap.md` summarizes the Studio recording proof checklist.
- `docs/recording/goal-311-320-recap.md` summarizes the Studio proof cue playback.
- `docs/recording/goal-321-330-recap.md` summarizes the Dream visual proof cue strip.
- `docs/recording/goal-331-340-recap.md` summarizes the Dream visual proof playback.
- `docs/recording/goal-341-350-recap.md` summarizes Dream visual proof playback QA evidence.
- `docs/recording/goal-351-360-recap.md` summarizes the Studio Dream Proof QA status card.
- `docs/recording/goal-361-370-recap.md` summarizes Studio Dream Proof evidence links.
- `docs/recording/goal-371-380-recap.md` summarizes Dream Proof evidence in the recording asset index.
- `docs/recording/goal-381-390-recap.md` summarizes the automated recording-index QA command.
- `docs/recording/goal-391-400-recap.md` summarizes the Studio Recording Index QA status card.
- `docs/recording/goal-401-410-recap.md` summarizes adding Recording Index QA to the full recording suite.
- `docs/recording/goal-411-420-recap.md` summarizes the recording suite run manifest.
- `docs/recording/goal-421-430-recap.md` summarizes the Studio Recording Suite status card.
- `docs/recording/goal-431-440-recap.md` summarizes Suite Run in Studio proof playback.
- `docs/recording/goal-441-450-recap.md` summarizes Studio QA capturing Suite Run proof playback.
- `docs/recording/goal-451-460-recap.md` summarizes Studio Proof playback QA status in Studio.
- `docs/recording/goal-461-470-recap.md` summarizes Studio Proof evidence in the recording asset index.
- `docs/recording/goal-471-480-recap.md` summarizes double-proof Recording Index QA.
- `docs/recording/goal-481-490-recap.md` summarizes surfacing double-proof Index QA in Studio.
- `docs/recording/goal-491-500-recap.md` summarizes Dream/Studio proof-check chips in Studio.
- `docs/recording/goal-501-510-recap.md` summarizes the Studio evidence timeline.
- `docs/recording/goal-511-520-recap.md` summarizes copying the proof-story narration outline.
- `docs/recording/goal-521-530-recap.md` summarizes the proof-story preview.
- `docs/recording/goal-531-540-recap.md` summarizes the Proof Story recording-script run.
- `docs/recording/goal-541-550-recap.md` summarizes the in-app Proof Story script-material card.
- `docs/recording/goal-551-560-recap.md` summarizes Studio QA capture for the Proof Story script-material card.
- `docs/recording/goal-561-570-recap.md` summarizes reading the latest script-material QA result back into `/studio`.
- `docs/recording/goal-571-580-recap.md` summarizes adding Proof Story Script Material to the recording asset index.
- `docs/recording/goal-581-590-recap.md` summarizes optional Recording Index QA checks for Proof Story Script Material.
- `docs/recording/goal-591-600-recap.md` summarizes surfacing the optional script-material Index QA result back in `/studio`.
- `docs/recording/goal-601-610-recap.md` summarizes the Proof Story closeout checklist in `/studio`.
- `docs/recording/goal-611-620-recap.md` summarizes the one-line Proof Story closeout copy action.
- `docs/recording/goal-621-630-recap.md` summarizes the Proof Story closeout status preview.
- `docs/recording/goal-631-640-recap.md` summarizes the Proof Story production-assets section in `clip-index.md`.
- `docs/recording/goal-641-650-recap.md` summarizes the Proof Story production-assets card in the browser index.
- `docs/recording/goal-651-660-recap.md` summarizes the Proof Story Production Assets readiness chip in `/studio`.
- `docs/recording/goal-661-670-recap.md` summarizes the Production Assets text assertions in Recording Index QA.
- `docs/recording/goal-671-680-recap.md` summarizes the Production Assets QA line in index-check clip notes.
- `docs/recording/goal-681-690-recap.md` summarizes the Production Assets QA receipt link in `/studio`.
- `docs/recording/goal-691-700-recap.md` summarizes copying the Production Assets QA receipt path from `/studio`.
- `docs/recording/goal-701-710-recap.md` summarizes the copyable Proof Story Delivery line in `/studio`.
- `docs/recording/goal-711-720-recap.md` summarizes writing the Proof Story Delivery line into Recording Index QA clip notes.
- `docs/recording/goal-721-730-recap.md` summarizes reading the QA clip-notes Delivery line back into `/studio`.
- `docs/recording/goal-731-740-recap.md` summarizes the copyable Proof Story Handoff line in `/studio`.
- `docs/recording/goal-741-750-recap.md` summarizes capturing the Handoff copy state in Studio QA notes.
- `docs/recording/goal-751-760-recap.md` summarizes surfacing the Handoff copy state back in `/studio`.
- `docs/recording/goal-761-770-recap.md` summarizes the final Proof Story Complete strip in `/studio`.
- `docs/recording/goal-771-780-recap.md` summarizes writing the Proof Story Complete line into Studio QA notes.
- `docs/recording/goal-781-790-recap.md` summarizes surfacing the Studio QA Complete archive state back in `/studio`.
- `docs/recording/goal-791-800-recap.md` summarizes adding the Complete archive line to the local recording asset index.
- `docs/recording/goal-801-810-recap.md` summarizes mirroring the Complete archive line into the dynamic API index and index QA.
- `docs/recording/goal-811-820-recap.md` summarizes surfacing the Index Complete verification state back in `/studio`.
- `docs/recording/goal-821-830-recap.md` summarizes adding the one-click Complete Bundle handoff line in `/studio`.
- `docs/recording/goal-831-840-recap.md` summarizes capturing the Complete Bundle line in Studio QA notes.
- `docs/recording/goal-841-850-recap.md` summarizes surfacing the Complete Bundle archive state back in `/studio`.
- `docs/recording/goal-851-860-recap.md` summarizes adding the Complete Bundle line to the Recording Index QA pipeline.
- `docs/recording/goal-861-870-recap.md` summarizes surfacing the Index Bundle verification state back in `/studio`.
- `docs/recording/goal-871-880-recap.md` summarizes adding the one-click Bundle Chain video-notes line in `/studio`.
- `docs/recording/goal-881-890-recap.md` summarizes capturing the Bundle Chain line in Studio QA notes.
- `docs/recording/goal-891-900-recap.md` summarizes surfacing the Bundle Chain archive state back in `/studio`.
- `docs/recording/goal-901-910-recap.md` summarizes adding the Bundle Chain line to the Recording Index QA pipeline.
- `docs/recording/goal-911-920-recap.md` summarizes surfacing the Index Chain verification state back in `/studio`.
- `docs/recording/goal-921-930-recap.md` summarizes surfacing Index Chain in the main Studio recording rail and proof checklist.
- `docs/recording/goal-931-940-recap.md` summarizes adding the one-click Proof Chain Summary post-production note.
- `docs/recording/goal-941-950-recap.md` summarizes capturing Proof Chain Summary in Studio visual QA outputs.
- `docs/recording/goal-951-960-recap.md` summarizes surfacing the Summary archive state back in `/studio`.
- `docs/recording/goal-961-970-recap.md` summarizes adding Proof Chain Summary to the Recording Index QA pipeline.
- `docs/recording/goal-971-980-recap.md` summarizes surfacing the Index Summary verification state back in `/studio`.
- `docs/recording/goal-981-990-recap.md` summarizes surfacing Index Summary in the main Studio recording rail and proof checklist.
- `docs/recording/goal-991-1000-recap.md` summarizes adding the one-click final delivery summary for clip notes.
- `docs/recording/proof-story-demo-script.md` gives a short `/studio` script for recording the evidence timeline, four-line proof-story preview, and copy action.
- `docs/recording/studio-dream-demo-script.md` gives a shot-by-shot Studio ↔ Dream demo recording path.
- `docs/recording/bridge-qa-evidence-script.md` gives a short Bridge QA proof clip script.
- `docs/recording/cinematic-visual-contract-script.md` gives a short `/dream` visual-contract recording script for template strategy, Scene Inspector, Proof Stack, and asset state.
- `docs/recording/director-lens-demo-script.md` gives a short `/dream` script for explaining the camera direction selector, Proof Stack, and asset-cache handoff.
- `docs/recording/director-lens-shot-matrix.md` maps every Director Lens mode to a recording move and QA command.
- `docs/recording/lens-visual-capture-workflow.md` explains how to generate and compare one QA pack per Director Lens mode.
- `docs/recording/content-system.md` defines the account content pillars.
- `docs/recording/vibe-coding-learning-journal.md` captures the learning narrative for voiceover.

## Boundaries

- No auth, database, payment, deployment, PDF export, or public sharing in v1.
- Do not hardcode API keys. Keep secrets in `.env.local`.
- AI travel content is planning assistance only. Users must verify opening hours, bookings, prices, weather, traffic, and safety before travel.
