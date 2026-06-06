# Vibe Coding Learning Journal

This journal is the narrative spine for explaining how the project was built. It is written for later voiceover, not for technical documentation only.

## Core Positioning

I am not presenting myself as someone who magically knows every framework. I am showing how I use AI as a practical coding partner:

- define the visible outcome first
- split the product into small layers
- let AI help implement each layer
- verify with real commands and screenshots
- keep mistakes and setup states as learning material

## Learning Arc

### Stage 1: From idea to visible product

What I learned:

- A vague idea like "AI travel agent" is too broad.
- The first useful question is: what should the viewer see in the first demo?
- For this project, the visible product is a beautiful Dali 4-day roadbook plus a map.

Voiceover:

> 我以前会很容易直接说“做一个 Agent”，但这样范围太大。这次我先问：观众最后看到什么？答案是一页能截图、能录屏、能真的拿来规划的大理路书。

### Stage 2: From prompt to product contract

What I learned:

- A chat-style answer is not stable enough for an app.
- The model needs a strict JSON shape so the UI can render predictable sections.
- The schema is the agreement between AI output and product UI.

Voiceover:

> Vibe Coding 不是只对 AI 说“帮我做一个攻略”。真正关键的是把需求变成结构：标题、每日路线、地点、预算、提醒，每个字段都能被页面消费。

### Stage 3: From pretty content to grounded map

What I learned:

- Travel content gets more credible when places can be located.
- Amap returns GCJ-02 coordinates; Leaflet expects WGS84-style coordinates.
- AI can draft the itinerary, but external services should handle location data.

Voiceover:

> 这里我学到一个边界：AI 适合生成规划，但地图位置不能靠 AI 猜。地点要交给高德定位，再转成前端地图能用的坐标。

### Stage 4: From coding output to content system

What I learned:

- Every error state can become tutorial material.
- Missing API keys, schema parsing, map setup, and build checks are all useful clips.
- Development notes should be written while building, not after forgetting the details.

Voiceover:

> 这次我不只录最后成功的样子，也保留配置缺失、接口边界、验证命令这些过程。因为学习 Vibe Coding 的价值就在这里：不是一次性成功，而是知道怎么把不确定变成可验证步骤。

## Repeatable Clip Formula

For each clip:

1. Show the visible goal.
2. Show the smallest technical step.
3. Explain the decision in plain language.
4. Run or show a verification result.
5. End with what this unlocks for the next clip.

## Personal Angle

The account angle is not "AI replaces travel planning." The stronger angle is:

> 我在学习怎么用 AI 把自己的兴趣变成小工具。第一个方向是旅行路书，因为它好看、实用、适合分享，也有机会慢慢变成产品能力。
