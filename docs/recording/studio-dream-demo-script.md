# Studio Dream Demo Script

Date: 2026-06-13

This script records the verified Studio ↔ Dream handoff flow. It is designed for a silent 16:9 screen capture first, with voiceover added later.

## Setup

- Start from `http://localhost:3000/studio?demo=coast`.
- Use a 1280x720 or 16:9 browser window.
- Keep `/studio` and `/dream` on the same local server.
- Optional check command before recording: `npm run check:recording-suite`.

## Shot List

| Shot | Screen | Action | What to show |
| --- | --- | --- | --- |
| 1 | `/studio?demo=coast` | Open the page. | The workbench starts directly in the 三亚海岛 local demo. |
| 2 | `/studio?demo=coast` | Click `脚本模式`. | Topbar cue, creator track, current shot cue, and series chapter chips appear. |
| 3 | `/studio?demo=coast` | Point at `Demo Bridge`. | The card says `三亚海岛 → Dream` and links to the matching Dream preview. |
| 4 | `/dream?demo=coast` | Click `打开同款梦境预览`. | Dream opens directly into the coastal route, dusk mood, and starlake template. |
| 5 | `/dream?demo=coast` | Point at `Studio Bridge`. | The visual preview explains how to return to the matching recording workbench. |
| 6 | `/studio?demo=coast` | Click `返回同款录屏台`. | Studio returns to the same 三亚海岛 demo instead of resetting to Dali. |

## Voiceover Cues

- "我把录屏台和梦境路书接成一条演示路径。"
- "Studio 负责讲 Agent 工作流，Dream 负责展示用户真正看到的高级路书画面。"
- "Demo Bridge 和 Studio Bridge 让两个页面互相知道当前是哪条路线。"
- "这样我录素材的时候，不用反复手动切大理或海岸，演示更稳定。"

## Verification

- `npm test -- components/studio-mode.test.tsx components/dream-roadbook.test.tsx`
- `npm run lint`
- `npm test`
- `npm run build`

## Editing Notes

- Use Shot 1-3 as the process/tutorial part.
- Use Shot 4 as the product visual part.
- Use Shot 5-6 as the "Agent workflow is becoming a real product" transition.
