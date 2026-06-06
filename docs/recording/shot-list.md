# LilyTravelAgent Recording Shot List

## Chapter 1: Idea To MVP

- Show the empty `LilyTravelAgent` folder.
- Explain the content angle: travel + AI, first make a visible roadbook MVP before monetization.
- Show the acceptance target: input brief, AI roadbook, map, screenshot-ready page.
- Add a personal learning line: "我不是只想做工具，也想记录自己怎么学习 Vibe Coding。"

## Chapter 2: Project Skeleton

- Show the app starting as a Next.js local project.
- Capture `README.md`, `.env.local.example`, and the split between API routes and UI.
- Voiceover idea: "先把产品边界做小，不做账号、不做数据库、不做部署。"

## Chapter 3: MiniMax Generation

- Show `POST /api/generate-roadbook`.
- Capture the prompt contract and JSON schema.
- Voiceover idea: "Agent 第一层不是聊天，而是把旅行需求变成结构化路书。"

## Chapter 4: Amap Geocoding

- Show `POST /api/geocode-places`.
- Capture GCJ-02 to WGS84 conversion.
- Voiceover idea: "高德负责定位，Leaflet 负责展示，中间要处理坐标系。"

## Chapter 5: Magazine Roadbook UI

- Show the form on the left and roadbook preview on the right.
- Capture cover, daily route, budget, reminders, and disclaimer.
- Voiceover idea: "路书要好看，但不能牺牲可执行信息。"

## Chapter 6: Live Demo

- Fill the default Dali 4-day brief.
- Generate the roadbook.
- Capture loading states, final roadbook, and map markers.
- If keys are missing, record the setup state as a useful tutorial moment.
- Use `/studio` when recording a clean 16:9 demo. It keeps input, roadbook, and Creator Track visible in one frame.
- Use `/dream` when recording the highly visual version: minimal words, 2.5D islands, route light path, and day-by-day interaction.

## Chapter 6B: Dream Roadbook Visual Prototype

- Open `/dream`.
- Show the three mood modes: 云海 / 几何 / 暮色.
- Click D1-D4 islands and record the text staying minimal.
- Voiceover idea: "我不想让 AI 只吐一大段攻略，我想让它生成一个像游戏世界一样的旅行路书。"

## Chapter 7: Review And Next Steps

- Show `npm run lint` and `npm run build`.
- Explain next possible features: PDF export, long image, saved history, public share link, POI search.

## Chapter 8: Vibe Coding Learning Recap

- Show the Creator Track panel in the app.
- Open `/studio` for a cleaner recap frame.
- Explain the four learning points:
  - define the visible outcome first
  - split the Agent into content/data/display layers
  - make AI output verifiable JSON
  - turn error states into tutorial material
- Voiceover idea: "我这次最大的收获不是某个组件怎么写，而是怎么把一个模糊想法变成可执行、可检查、可录屏的步骤。"
