# Content System For LilyTravelAgent

## Account Direction

Theme: travel + AI + learning Vibe Coding in public.

Promise:

- Build useful mini tools around travel.
- Show the actual development process.
- Explain AI coding decisions in plain language.
- Turn each build step into reusable video material.

## Content Pillars

### 1. Product Demo

Goal: make people want to watch the generated roadbook.

Examples:

- "AI 自动生成大理 4 天游玩路书"
- "输入预算和兴趣，生成一份可截图的旅行计划"
- "用地图检查 AI 推荐的路线是否顺"
- "同一份路书，用不同 Director Lens 生成不同视觉预览"

### 2. Vibe Coding Learning

Goal: show the learning journey, not just the result.

Examples:

- "我学到的第一件事：先定义成品画面"
- "为什么我让 AI 输出 JSON，而不是一段攻略文"
- "一个 API key 没配好，也能变成教程素材"

### 3. Build Breakdown

Goal: teach viewers how the Agent is assembled.

Examples:

- "MiniMax 负责生成，高德负责定位，Leaflet 负责地图"
- "旅游 Agent 的最小架构"
- "怎么把 AI 文案变成网页路书"
- "怎么把审美拆成 Prompt、Lens、Scene、Proof、Asset"

### 4. Future Product Thinking

Goal: keep the account connected to long-term value.

Examples:

- "这个工具以后可以怎么变成定制路书服务"
- "下一步我会做 PDF/长图/分享链接里的哪一个"
- "为什么先不做登录和付费"

## Episode Structure

Use this structure for most videos:

1. Hook: one sentence about the visible result or mistake.
2. Context: why this step matters.
3. Screen: show the app/code/config for 10-30 seconds.
4. Explanation: use plain language, not framework jargon first.
5. Proof: show running page, command output, or before/after.
6. Next step: what the next clip will build.

## First 10 Clips

1. 我想做一个专门生成旅游路书的 AI Agent
2. 为什么我没有一开始做完整产品
3. Vibe Coding 第一课：先把成品画面定下来
4. 从空文件夹搭一个 Next.js 本地工具
5. 让 MiniMax 输出结构化路书
6. 为什么 AI 生成的攻略还要接高德地图
7. 用 Leaflet 做一个高级感路线地图
8. 把路书页面做成适合截图的杂志感
9. 缺 API key 时不要崩，要显示配置提示
10. 大理 4 天游玩路书第一次完整生成
11. 给 AI 路书加 Director Lens：让用户选择镜头语言
12. 用 Proof Stack 检查一个“好看”的页面

## What To Record Every Time

- current screen before the change
- the one file or panel being changed
- the reason for the change
- the verification result
- one sentence of reflection: "这一步我学到..."

## Default Recording Screens

- `/` for the real working tool and full roadbook/map experience.
- `/studio` for clean 16:9 recording with input, roadbook preview, and Creator Track in one frame.
- `/dream` for the highly visual dream-roadbook direction with minimal text and 2.5D geometry.
- `/dream` with `Skyline` Director Lens for clips about camera direction and cinematic proof.
- code editor for implementation breakdowns.
- terminal only when showing verification commands or setup states.
