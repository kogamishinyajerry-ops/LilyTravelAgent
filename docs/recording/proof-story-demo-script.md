# Proof Story Demo Script

Date: 2026-06-14

Purpose: record a compact Studio clip that turns the evidence timeline into a visible creator narration asset. This is for silent 16:9 screen capture first, then later voiceover or captions.

## Setup

- Start from `http://localhost:3000/studio`.
- Use a 1280x720 or wider 16:9 browser window.
- Run `npm run check:recording-suite` before recording if the evidence cards are empty.
- Open `脚本模式` so the creator track and proof workflow are visible.
- Keep the recording asset panel in view; do not switch to `/dream` for this clip.

## Click Path

1. Open `/studio`.
2. Click `脚本模式`.
3. Scroll or frame the recording asset panel so `证据时间线`, `讲解稿预览`, and `复制讲解稿` are visible together.
4. Hover or point across the four timeline steps: `Dream Proof`, `Studio Proof`, `Index QA`, `Suite Run`.
5. Point at the four-line `讲解稿预览`.
6. Click `复制讲解稿`.
7. Keep the final frame on the preview and timeline for 2 seconds.

## Shot List

| Shot | Screen focus | Action | What to show |
| --- | --- | --- | --- |
| 1 | Studio topbar | Click `脚本模式`. | This is the recording workbench, not the normal user page. |
| 2 | Evidence timeline | Move across all four steps. | The Agent proof chain is ordered from product visual proof to full suite receipt. |
| 3 | Proof-story preview | Pause on the four preview lines. | The narration is generated from the same timeline that appears on screen. |
| 4 | Copy action | Click `复制讲解稿`. | The visible four lines become a reusable caption or voiceover draft. |
| 5 | Final composition | Hold on timeline + preview. | The clip ends with proof, script, and action in one frame. |

## Narration Prompts

- "我不是录完之后再硬写文案，而是让产品自己把证据链生成讲解稿。"
- "第一步是 Dream Proof，证明用户看到的梦境路书画面已经被 QA 捕获。"
- "第二步是 Studio Proof，证明录屏台自己的讲解流程也有截图证据。"
- "第三步是 Index QA，证明这些素材已经进入本地素材总索引。"
- "最后是 Suite Run，用一条完整命令把前面所有证据收口。"
- "所以这条视频讲的不只是界面，而是一个 Agent 如何把产品、验证、素材管理连成闭环。"

## Retake Checklist

- The browser is 16:9 and the recording asset panel is not cropped.
- `证据时间线` appears before `讲解稿预览`.
- The preview shows four lines, not an empty or missing-evidence state.
- `复制讲解稿` is visible before clicking.
- No terminal window, API key, or `.env.local` content appears on screen.
- The final frame holds long enough for later captions.

## Verification

- `npm run check:recording-suite`
- `npm run check:recording-index`
- `npm run check:studio-visuals`

## Editing Notes

- Keep this as a 30-45 second insert clip.
- Use it after the Studio evidence timeline clip and before any longer archive/index explanation.
- Good title options: `把 Agent 证据链变成讲解稿`, `Vibe Coding 录屏台：证据到旁白`, `我的旅游 AI Agent 如何自动生成素材脚本`.
