# Director Lens Demo Script

Purpose: record how the travel Agent turns a roadbook into a controllable visual direction system, without explaining implementation details on screen.

## Clip Setup

- Open `/dream`.
- Keep the default Dali demo unless the clip needs the coastal route.
- Start from `Auto Director`.
- Optional pre-check: run `DREAM_LENS=low-skyline npm run check:dream-visuals` with the local dev server running.

## Shot Flow

| Step | Screen action | Talk track |
| --- | --- | --- |
| 1 | Show the top control panel. | "我不是只让 AI 写路书，而是把路书变成可导演的视觉系统。" |
| 2 | Point to `Director Lens`. | "这里是镜头语言：宽水面、低机位天际线、等距地图、近景细节。" |
| 3 | Click `Skyline`. | "同一份大理 4 天路书，换一个镜头，画面的空间感就变了。" |
| 4 | Click D1-D4 in the director timeline. | "每天不是一段长文，而是一个镜头 beat：古城、洱海、喜洲、收尾。" |
| 5 | Show `Agent Visual Contract`. | "Prompt、Lens、Scene、Proof、Asset 放在一起，录屏时能解释 Agent 怎么工作。" |
| 6 | Show `Proof Stack`. | "我会把审美拆成可以检查的证据：构图、镜头、地标、资产、地图。" |
| 7 | Show asset panel. | "预览资产也记住了当前镜头，后面缓存和封面都能追踪。" |

## QA Evidence

- `summary.json` records `directorLens` and `activeLens`.
- `index.html` shows the selected lens in the page meta.
- `clip-notes.md` includes the Director Lens for the whole run and each D1-D4 shot.

## Short Voiceover

> 我这一步不是追求复杂 3D，而是先做一个可控的导演层。用户生成路书后，可以选择镜头语言；Agent 再把这个镜头写进 Prompt、Scene、Proof Stack 和资产缓存。这样每一次动态路书都不是模板换皮，而是有明确视觉方向的定制化旅行预览。
