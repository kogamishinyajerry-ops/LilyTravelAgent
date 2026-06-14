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

`/studio` also links to `/api/recording-assets/lens-comparison`, a local Director Lens comparison dashboard. It reads the newest Dream QA pack for each lens, groups shared `runStamp-lens-*` folders into complete five-lens batches, shows current-vs-previous D1-D4 pure 3D crops, labels each pair as `Changed`, `Subtle`, or `Missing` from existing canvas stats, ranks the top changed shots in a `Best Recording Candidates` strip, shows an `Open first candidate` primary action plus 1-4 queue chips, gives each ranked candidate a compact current-scene thumbnail, adds a `Why:` badge from the diff metric, opens `/dream` with candidate queue query params, surfaces the Scene Inspector tuning cue plus a compact review checklist, and links back to `/dream?lens=...` for same-lens recording.

## Review Loop

1. Open `/studio`.
2. Click `镜头对比`.
3. Read the Current Batch and Previous Batch chips at the top.
4. Use `Best Recording Candidates`, `Open first candidate`, and the 1-4 queue chips to pick the strongest changed shot.
5. Compare `Auto`, `Water`, `Skyline`, `Atlas`, and `Detail` with the Current row above the Previous row.
6. Pick one lens that best supports the clip thesis.
7. Click a candidate to open `/dream` with the same lens, active candidate day, visible candidate cue, clickable next-candidate chip, and return link to the comparison dashboard.
8. Open its `clip-notes.md` when you need the QA notes.
9. Record `/dream` with the same lens selected.

## What To Judge

- Does the selected lens create a visibly different composition?
- Does the `Best Recording Candidates` strip surface the shot you would actually record?
- Does the strip make the first action obvious before jumping into `/dream`?
- Do the 1-4 queue chips make the recording order visible at a glance?
- Do the candidate thumbnails make the visual difference readable without scrolling down to the full crop grid?
- Does each candidate explain why it was picked in one short `Why:` badge?
- Does hover/focus make the active candidate obvious without changing the strip height?
- Does the `/dream` handoff show the candidate cue in the first viewport?
- Does the cue show current candidate count and the next candidate without needing storage?
- Does the `Next` chip advance to the next ranked candidate when clicked?
- Does the last candidate show `Final candidate` instead of a dead `Next` chip?
- Does the current crop show a visible change against the previous complete batch?
- Do `Changed` / `Subtle` badges match the visible crop differences well enough for narration?
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
