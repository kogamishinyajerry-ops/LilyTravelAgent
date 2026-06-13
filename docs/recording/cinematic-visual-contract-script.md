# Cinematic Visual Contract Script

Date: 2026-06-14

Purpose: record a short product-build clip that explains how the `/dream` page turns a visual template into a concrete Agent contract: prompt strategy, director lens, scene proof, asset state, and QA evidence.

## Setup

- Start from `http://localhost:3000/dream`.
- Use a 1280x720 or wider 16:9 browser window.
- Keep the default Dali demo first, then optionally switch to the coastal demo.
- Optional check command before recording: `DREAM_LENS=low-skyline npm run check:dream-visuals`.

## Shot List

| Shot | Screen | Action | What to show |
| --- | --- | --- | --- |
| 1 | `/dream` | Start on the default Dali page. | The cinematic roadbook opens with minimal text and a live 3D preview. |
| 2 | `/dream` | Point at the template rendering strategy under the template grid. | The selected template has a lens, surface, and motion strategy. |
| 3 | `/dream` | Click `Skyline` in `Director Lens`. | The same roadbook can change camera language without changing the itinerary. |
| 4 | `/dream` | Point at `Agent Visual Contract`. | The Agent contract connects Prompt, Lens, Scene, Proof, and Asset. |
| 5 | `/dream` | Point at `Scene Inspector`. | The same shot has Lens, Depth, Layer, and Motion fields. |
| 6 | `/dream` | Click D1-D4 in the director timeline. | Each day changes the visible scene proof and cinematic cue. |
| 7 | `/dream` | Optional: switch to the coastal demo. | The strategy changes from Monument to Starlake, proving templates are not just colors. |

## Voiceover Cues

- "我不想让模板只是换皮肤，所以我把每个模板拆成 lens、surface、motion 三个生成策略。"
- "Director Lens 是第二层控制：它决定用宽水面、低机位 skyline、等距地图，还是近景细节来讲这条路线。"
- "Agent Visual Contract 是录屏时最重要的证据：Prompt 决定怎么生成，Lens 决定怎么拍，Scene 决定今天的镜头，Proof Stack 说明哪些层已经 ready。"
- "Scene Inspector 是更底层的导演视图，它告诉我这一天是宽水面镜头、院落焦点，还是港口 skyline。"
- "这就是我理解的 Vibe Coding：不是随便让 AI 画一个页面，而是把审美拆成可复用、可验证、可讲解的产品结构。"

## Verification

- `npm test -- components/dream-roadbook.test.tsx`
- `npm test -- lib/cinematic-scene-preset.test.ts lib/dream-design-skill.test.ts`
- `npm run check:dream-visuals`
- `DREAM_LENS=low-skyline npm run check:dream-visuals`
- `npm run lint`
- `npm test`
- `npm run build`

## Editing Notes

- Keep this as a 45-90 second insert clip.
- Use it after the Bridge QA evidence clip and before any real image-generation demo.
- Pair the final scene with `recordings/visual-checks/*/index.html` if you want to show automated visual proof.
