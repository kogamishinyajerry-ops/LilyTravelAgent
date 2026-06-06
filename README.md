# LilyTravelAgent

Local MVP for a travel-roadbook Agent. It generates a customized Chinese travel itinerary with MiniMax, geocodes generated places through Amap Web Service, and renders a magazine-style roadbook with a Leaflet map.

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

Use `http://localhost:3000/dream` for the generative dream-roadbook prototype with minimal text, Three.js terrain, and an optional MiniMax cinematic preview image layer.

Use `http://localhost:3000/share-preview` for the 16:9 post-cover recording card. `/dream` generates the query link automatically from the current roadbook and asset cache.

`/dream` uses two-stage generation: first a lightweight dream preview, then a background full-detail roadbook pass. After the preview roadbook is available, it also requests `/api/generate-preview-asset` to generate a 16:9 cinematic destination image; if image generation fails, the procedural Three.js scene remains as the fallback.

The `/dream` Scenic Render Skill panel lets you upload a local PNG/JPG/WebP landscape photo. `/api/generate-scenic-render-design` asks MiniMax-M3 to turn that photo into a structured render blueprint: terrain, architecture, water/vegetation, lighting, camera, materials, Three.js plan, and an image-generation prompt. When you regenerate the preview asset, that blueprint is added to the cinematic image prompt so the destination preview is more grounded in the uploaded scene.

For recording, `/dream` also includes a one-click real-photo sample library with Dali, coast, city skyline, and China alley examples. Clicking a sample loads it and automatically starts the MiniMax-M3 photo-to-render design step. The local files live in `public/sample-photos/`, with source attribution in `public/sample-photos/ATTRIBUTION.md`.

Preview images are cached locally under `.lily-cache/preview-assets` by default. The cache key includes destination, day count, visual style, model, prompt, and roadbook content, so repeating the same roadbook/style reads the saved image instead of calling image generation again.

The `/dream` right-side asset panel shows the current cache key, cache time, source, clear action, and force-regenerate action for recording the visual asset pipeline. Every successful real image generation is also saved into a local history drawer, so users can compare, restore, and mark a final roadbook cover without calling the image model again.

After a cover is locked, the share-preview card presents the final cover, roadbook title, four-day route, cache key, and asset status as a clean recording-ready handoff view.

## Real Terrain Pipeline (Optional)

To enable real terrain in /dream: set MAPBOX_TOKEN in .env.local. The "真实地形管线" toggle in the /dream right panel will then fetch Mapbox terrain-rgb + OSM Overpass buildings. Without a token, the toggle falls back to the procedural Three.js scene.

v0.5.0 adds full 高德 3D building pipeline: extensions=all, multi-type-code queries, heuristic height estimation. Set `AMAP_KEY` in `.env.local`. The pipeline runs alongside the Mapbox/Overpass sources; missing tokens gracefully fall back to procedural buildings.

## Verification

```bash
npm run lint
npm run build
```

## Recording And Learning Assets

- `docs/recording/shot-list.md` breaks the build into screen-recording chapters.
- `docs/recording/video-outline.md` provides short-video and long-video structures.
- `docs/recording/dev-log.md` is the running production log for each clip.
- `docs/recording/content-system.md` defines the account content pillars.
- `docs/recording/vibe-coding-learning-journal.md` captures the learning narrative for voiceover.

## Boundaries

- No auth, database, payment, deployment, PDF export, or public sharing in v1.
- Do not hardcode API keys. Keep secrets in `.env.local`.
- AI travel content is planning assistance only. Users must verify opening hours, bookings, prices, weather, traffic, and safety before travel.
