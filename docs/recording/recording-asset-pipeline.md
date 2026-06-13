# Recording Asset Pipeline

Purpose: turn every visual QA run into usable creator material: screenshots, local galleries, clip notes, and a visible Studio status panel.

## Run Order

1. Start the local app.
2. Run `npm run check:recording-suite`.
3. Open `/studio`.
4. Click `刷新` in the `素材资产` panel.
5. Point to `Bridge QA 证据状态`.
6. Open `打开总索引`.

Optional lens-specific run:

```bash
DREAM_LENS=low-skyline npm run check:dream-visuals
```

## What The Suite Creates

- `/dream` Dali QA pack: product footage for the default dream roadbook.
- `/dream` coastal QA pack: product footage for the coastal preset.
- `/dream` Skyline Lens QA pack: camera-direction proof for the Dali roadbook with `DREAM_LENS=low-skyline`.
- Each Dream QA pack includes D1-D4 screenshots, Scene Inspector text, Composition profile, Director Lens status, Proof Stack status, WebGL pixel checks, and micro-motion evidence.
- `/studio` QA pack: walkthrough footage for the 16:9 creator workbench.
- Studio-Dream Bridge QA pack: handoff proof for the two-way recording circuit.
- `recordings/index.html` and `recordings/clip-index.md`: the local archive entry points.

## What To Show On Screen

- Total asset count.
- Dream / Studio / Bridge pack counts.
- Recent three QA packs.
- Dream QA / Studio QA / Bridge QA badges.
- `产品画面` / `讲解画面` / `桥接验证` usage hints.
- A Skyline Lens Dream QA pack in the local index after `npm run check:recording-suite`.
- `Bridge QA 证据状态` in script mode.
- In `/dream`, `Agent Visual Contract`, `Director Lens`, `Scene Inspector`, and `Proof Stack` show why the cinematic page is structured, not only decorative.
- `打开总索引` leading to `/api/recording-assets/index`.

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

## Verification

```bash
npm run check:recording-suite
npm run lint
npm test
npm run build
```
