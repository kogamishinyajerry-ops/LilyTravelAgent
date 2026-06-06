# Two Stage Trigger Track

## Current Product Shape

`/dream` shows the Agent workflow as a local progress track:

- 接收需求
- 预览完成
- 补全细节
- 地图定位

This is intentionally local-first. It does not require a job queue, database, deployment, or Trigger.dev account for the MVP.

## Why It Looks Like Trigger.dev

The UI is designed as a visible run timeline. It makes the generation process recordable:

- Stage 1 returns a lightweight dream roadbook quickly.
- Stage 2 keeps working in the background.
- The map card proves route places are being located.
- If the full pass fails, the preview stays visible.

## Future Trigger.dev Handoff

When this becomes a real hosted workflow, the same UI can consume Trigger.dev run state:

- `generate-dream-preview`
- `generate-full-roadbook`
- `geocode-route`
- `publish-share-page`

The UI should not change much. Only the data source changes from local React state to real run events.

Reference for later implementation: https://trigger.dev/docs/manual-setup
