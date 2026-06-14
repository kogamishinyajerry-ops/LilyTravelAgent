# Recording Asset Pipeline

Purpose: turn every visual QA run into usable creator material: screenshots, local galleries, clip notes, and a visible Studio status panel.

## Run Order

1. Start the local app.
2. Run `npm run check:recording-suite`.
3. Run `npm run check:recording-index`.
4. Open `/studio`.
5. Click `刷新` in the `素材资产` panel.
6. Turn on `脚本模式`.
7. Point to `录屏证据清单`.
8. Click `播放证据线`.
9. Point to `Bridge QA 证据状态`.
10. Point to `候选点击 QA 状态`.
11. Open `打开总索引`.
12. Open `镜头对比`.

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
- Dream visual-proof playback evidence in both local archive entry points when a Dream QA pack contains `summary.visualProof`.
- Studio proof playback evidence in both local archive entry points when a Studio QA pack contains `summary.proofPlayback`.
- `recordings/index-checks/*`: proof that the generated archive exposes Dream Proof and Studio Proof and that all six screenshot, summary, and notes links return HTTP 200.
- `recordings/suite-runs/*`: top-level proof for a full recording-suite run, listing every step, pass/fail status, duration, and output paths.
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
- `Dream Proof` status in `/studio`, showing the latest Dream visual proof playback result.
- `Dream Proof` evidence links in `/studio`: playback screenshot, summary, and clip notes.
- `Dream Proof` evidence in `/api/recording-assets/index` and `recordings/index.html`: final cue, readiness value, playback screenshot, summary, and notes.
- `Studio Proof` evidence in `/api/recording-assets/index` and `recordings/index.html`: final Suite Run cue, playback screenshot, summary, and notes.
- `Recording Index QA` status in `/studio`: proof-card screenshot, summary, and notes from the latest `index-checks` run.
- `Recording Suite` status in `/studio`: full-suite pass/fail state, step count, duration, summary, and notes from the latest `suite-runs` manifest.
- `Studio Proof` status in `/studio`: Suite Run proof playback captured by the latest Studio visual QA pack.
- `Bridge QA 证据状态` in script mode.
- `候选点击 QA 状态` in the `/studio` asset panel after `npm run check:lens-candidate-handoff`.
- `Index QA` in the `/studio` proof checklist after `npm run check:recording-index`.
- `Suite Run` in the `/studio` proof checklist after `npm run check:recording-suite`, used as the final playback cue.
- `npm run check:studio-visuals` captures the Suite Run final proof cue and writes `studio-suite-run-proof.png`.
- `/dream` `Dream Visual Proof Cue Strip`, covering Terrain, Skyline, AI Asset, Route, and Proof over the cinematic scene.
- `/dream` `播放视觉证据`, highlighting those five visual proof cues in recording order.
- `npm run check:dream-visuals` captures the visual proof cue labels, final `Proof` playback state, and `dream-*-visual-proof-playback.png`.
- `npm run check:recording-index` verifies `/api/recording-assets/index` exposes Dream Proof and Studio Proof, then writes an `index-checks` proof pack with two proof-card screenshots and six link checks. `npm run check:recording-suite` runs this step after generating the asset index.
- `npm run check:recording-suite` writes a `suite-runs` manifest and clip notes after the full QA chain finishes.
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
- "The archive does not only list screenshots. It also carries the Dream Proof playback result, so evidence survives outside the Studio screen."
- "The Studio panel now shows that the archive itself was checked: screenshot, summary, and notes are all linked from Index QA."
- "The full recording suite now creates the index proof pack automatically, so one command prepares both assets and their archive QA."
- "The suite manifest is the receipt for the whole run: every step, every output folder, one top-level proof."
- "Studio now shows that top-level receipt, so recording readiness is visible without opening the terminal."
- "The proof playback line now ends at Suite Run, which closes the whole QA story in one highlighted step."
- "Studio visual QA records that final Suite Run highlight, so the recording proof is not only visible live but saved in the QA pack."
- "Studio now reads that saved proof back into the workbench, closing the loop from UI to QA pack and back to UI."
- "The archive now carries both sides of the proof loop: Dream Proof for the product screen and Studio Proof for the creator workbench."
- "The lens batch lets me compare five camera directions before I tune or record the final clip."

## Verification

```bash
npm run check:recording-suite
npm run check:lens-candidate-handoff
npm run check:recording-index
npm run lint
npm test
npm run build
```
