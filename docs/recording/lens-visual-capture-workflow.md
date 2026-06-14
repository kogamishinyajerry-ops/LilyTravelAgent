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
- `summary.json`
- `index.html`
- `clip-notes.md`
- active Director Lens metadata

After `npm run index:recording-assets`, the top-level recording index shows lens-aware titles such as `Dream low-skyline lens visual pack`, and `/studio` recent asset cards show a lens chip.

## Review Loop

1. Open `recordings/index.html`.
2. Compare `Auto`, `Water`, `Skyline`, `Atlas`, and `Detail`.
3. Pick one lens that best supports the clip thesis.
4. Open its `clip-notes.md`.
5. Record `/dream` with the same lens selected.

## What To Judge

- Does the selected lens create a visibly different composition?
- Does the D1-D4 director timeline still read clearly?
- Does the map stay compact and non-distracting?
- Does the Proof Stack show `Director` as ready?
- Does the asset panel expose the same lens and cache key?

## Next Tuning Slice

After the five packs exist, tune one lens at a time. Start with `low-skyline`, because it is the clearest path toward city-skyline visual impact.
