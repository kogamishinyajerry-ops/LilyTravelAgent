# Bridge QA Evidence Script

Date: 2026-06-13

Purpose: record a short evidence-focused clip that explains why the Studio-Dream bridge is more than navigation. The clip should show that the Agent workflow generates proof assets around the product experience.

## Setup

- Start from `http://localhost:3000/studio?demo=coast`.
- Run `npm run check:recording-suite` before recording if the Bridge QA evidence card is empty.
- Use a 1280x720 or wider 16:9 browser window.
- Turn on `脚本模式`.

## Shot List

| Shot | Screen | Action | What to show |
| --- | --- | --- | --- |
| 1 | `/studio?demo=coast` | Point at the topbar `讲解轨道已打开`. | The page is in recording mode, not normal browsing mode. |
| 2 | `/studio?demo=coast` | Point at `Bridge QA 证据状态`. | The card shows `1 个桥接素材` and says the Studio-Dream loop is verified. |
| 3 | `/studio?demo=coast` | Point at the recent `Bridge QA` asset card. | The card is visually distinct from Dream product footage and Studio walkthrough footage. |
| 4 | `/studio?demo=coast` | Point at the workflow rail step `桥接证据`. | The local QA workflow ends by showing proof, not only by generating screenshots. |
| 5 | `/studio?demo=coast` | Point at `Demo Bridge`. | The visible bridge has `Recording suite 已覆盖`, connecting the product link to the QA rail. |

## Voiceover Cues

- "我不只是做一个好看的跳转按钮，我把跳转做成了可验证的素材。"
- "Dream QA 是产品画面，Studio QA 是讲解画面，Bridge QA 是页面闭环的证据。"
- "这就是我想持续记录 Vibe Coding 的原因：每次小改动，都能沉淀成可讲的产品资产。"

## Verification

- `npm run check:recording-suite`
- `npm run lint`
- `npm test`
- `npm run build`

## Editing Notes

- Keep this as a 30-60 second insert clip.
- Use it between the Studio workbench chapter and the Dream cinematic preview chapter.
- Pair it with the longer `docs/recording/studio-dream-demo-script.md` when recording a full workflow video.
