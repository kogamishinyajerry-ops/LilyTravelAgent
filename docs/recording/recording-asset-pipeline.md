# Recording Asset Pipeline

Purpose: turn every visual QA run into usable creator material: screenshots, local galleries, clip notes, and a visible Studio status panel.

## Run Order

1. Start the local app.
2. Run `npm run check:recording-suite`.
3. Open `/studio`.
4. Click `刷新` in the `素材资产` panel.
5. Turn on `脚本模式`.
6. Point to `录屏证据清单`.
7. Click `播放证据线`.
8. Point to `Bridge QA 证据状态`.
9. Point to `候选点击 QA 状态`.
10. Open `打开总索引`.
11. Open `镜头对比`.

Optional all-lens product run:

```bash
npm run check:dream-lenses
```

Optional lens-specific subset:

```bash
DREAM_LENSES=low-skyline,isometric-atlas npm run check:dream-lenses
```

## What The Suite Creates

- `/dream` Dali QA pack: product footage for the default dream roadbook.
- `/dream` coastal QA pack: product footage for the coastal preset.
- `/dream` Director Lens QA packs: camera-direction proof for Water, Skyline, Atlas, and Detail on the Dali roadbook.
- Each Dream QA pack includes D1-D4 screenshots, Scene Inspector text, Composition profile, Director Lens status, Proof Stack status, WebGL pixel checks, and micro-motion evidence.
- `/studio` QA pack: walkthrough footage for the 16:9 creator workbench.
- Studio-Dream Bridge QA pack: handoff proof for the two-way recording circuit.
- Candidate handoff QA: dashboard-to-`/dream` click proof for ranked recording candidates.
- `recordings/index.html` and `recordings/clip-index.md`: the local archive entry points.
- `/api/recording-assets/lens-comparison`: the local Director Lens comparison dashboard with D1-D4 thumbnails.

## What To Show On Screen

- Total asset count.
- Dream / Studio / Bridge pack counts.
- Copy buttons for `npm run check:recording-suite` and `npm run check:lens-candidate-handoff`.
- Recent three QA packs.
- Dream QA / Studio QA / Bridge QA badges.
- `产品画面` / `讲解画面` / `桥接验证` usage hints.
- Lens-aware Dream QA packs in the local index after `npm run check:recording-suite`.
- `录屏证据清单` in script mode, covering Bridge QA, Candidate QA, Lens Compare, and Asset Index.
- `播放证据线` in script mode, highlighting those four proof rows in recording order.
- `Bridge QA 证据状态` in script mode.
- `候选点击 QA 状态` in the `/studio` asset panel after `npm run check:lens-candidate-handoff`.
- In `/dream`, `Agent Visual Contract`, `Director Lens`, `Scene Inspector`, and `Proof Stack` show why the cinematic page is structured, not only decorative.
- `打开总索引` leading to `/api/recording-assets/index`.
- `镜头对比` leading to `/api/recording-assets/lens-comparison`.

## First-Run State

If the index is missing, `/studio` shows:

```bash
npm run check:recording-suite
```

Run it, return to `/studio`, then click `刷新`.

## Voiceover Notes

- "I do not only generate a travel roadbook. I also generate the evidence and recording assets around it."
- "The Agent workflow has two outputs: the product screen and the creator material archive."
- "Dream QA is product footage. Studio QA is walkthrough footage. Bridge QA proves the handoff."
- "In Dream QA, the screenshot is paired with a visual contract: prompt strategy, director lens, scene proof, asset state, and motion evidence."
- "The lens batch lets me compare five camera directions before I tune or record the final clip."

## Verification

```bash
npm run check:recording-suite
npm run check:lens-candidate-handoff
npm run lint
npm test
npm run build
```
