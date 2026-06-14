# Lens Visual Capture Workflow

Purpose: generate one local QA pack per Director Lens so the creator can compare camera directions before recording or tuning the 3D scene.

## Run

Start the local app, then run:

```bash
npm run check:dream-lenses
npm run index:recording-assets
```

To run only a subset:

```bash
DREAM_LENSES=low-skyline,isometric-atlas npm run check:dream-lenses
```

The full recording suite also covers every Director Lens mode:

```bash
npm run check:recording-suite
```

## Output

Each lens run writes a folder under `recordings/visual-checks/` with:

- D1-D4 screenshots
- D1-D4 pure WebGL `*-scene.png` crops for visual comparison
- `summary.json`
- `index.html`
- `clip-notes.md`
- active Director Lens metadata
- structured Lens tuning evidence from Scene Inspector

After `npm run index:recording-assets`, the top-level recording index shows lens-aware titles such as `Dream low-skyline lens visual pack`, and `/studio` recent asset cards show a lens chip.

`/studio` also links to `/api/recording-assets/lens-comparison`, a local Director Lens comparison dashboard. It reads the newest Dream QA pack for each lens, shows D1-D4 pure 3D thumbnails side-by-side, surfaces the Scene Inspector tuning cue plus a compact review checklist, and links back to `/dream?lens=...` for same-lens recording.

## Review Loop

1. Open `/studio`.
2. Click `镜头对比`.
3. Compare `Auto`, `Water`, `Skyline`, `Atlas`, and `Detail`.
4. Pick one lens that best supports the clip thesis.
5. Click `Open Dream` to return with the same lens selected.
6. Open its `clip-notes.md` when you need the QA notes.
7. Record `/dream` with the same lens selected.

## What To Judge

- Does the selected lens create a visibly different composition?
- Does the pure 3D crop show improvement without relying on surrounding UI?
- Are terrain depth, water reflections, and active landmark scale visible in the crop?
- Are old-town gate/courtyard details readable as roof tiers, arch shadows, and light accents?
- Does the D1-D4 director timeline still read clearly?
- Does the map stay compact and non-distracting?
- Does the Proof Stack show `Director` as ready?
- Does the asset panel expose the same lens and cache key?
- Does Scene Inspector show the expected tuning cue?

## Expected Tuning Cues

| Lens | Scene Inspector Tune |
| --- | --- |
| Auto | `skyline 1.00x / water 1.00x / route 1.00x` |
| Water | `skyline 0.90x / water 1.36x / route 0.82x` |
| Skyline | `skyline 1.34x / water 1.08x / route 1.18x` |
| Atlas | `skyline 0.72x / water 0.82x / route 1.42x` |
| Detail | `skyline 1.18x / water 0.72x / route 0.78x` |

## Next Tuning Slice

After the five packs exist, tune one lens at a time. The first pass now gives every lens a measurable Scene Inspector cue. The next pass should compare the actual screenshots and tune geometry/materials when the visible difference is weaker than the cue implies.
