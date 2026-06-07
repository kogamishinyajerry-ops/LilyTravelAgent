"use client";

import { Building2, Sparkles } from "lucide-react";
import type { LandmarkPreset } from "@/lib/landmark-preset";

/**
 * Compact "blueprint card" rendered after a LandmarkPreset is generated.
 *
 * Goals:
 * - One-glance recognition: icon + name + source badge + counts.
 * - Click the preset name to jump the parent scene to the affected day
 *   (no-op when the scene is already showing).
 * - Tiny preview thumbnail when the preset carries a `preview` field.
 *
 * The card is intentionally data-driven: every visible chip is a function
 * of the preset object, and every optional field (preview, sceneDay,
 * symbol) is treated as "show if present, hide otherwise".
 */
export type LandmarkBlueprintCardProps = {
  preset: LandmarkPreset;
  /** ID of the currently shown scene; used to skip the scroll no-op. */
  currentSceneDay?: number;
  /** Called when the user clicks the preset name. */
  onActivateScene?: (day: number) => void;
  /** Model id shown next to the source badge (e.g. `MiniMax-M3`). */
  model?: string;
};

export function LandmarkBlueprintCard({
  preset,
  currentSceneDay,
  onActivateScene,
  model,
}: LandmarkBlueprintCardProps) {
  const lightsCount = preset.lights?.length ?? 0;
  const primitivesCount = preset.primitives.length;
  const isM3 = preset.source === "m3-generated";
  const sourceLabel = isM3 ? "已用 M3 生成" : preset.source === "procedural-fallback" ? "程序化兜底" : preset.source;
  const sourceTone = isM3 ? "m3" : preset.source === "procedural-fallback" ? "fallback" : "neutral";
  const symbol = preset.symbol || "🗿";
  const sceneDay = preset.sceneDay;
  const isCurrentScene = sceneDay !== undefined && sceneDay === currentSceneDay;
  const canActivate = sceneDay !== undefined && onActivateScene && !isCurrentScene;

  const handleClickName = () => {
    if (canActivate && sceneDay !== undefined && onActivateScene) {
      onActivateScene(sceneDay);
    }
  };

  return (
    <div className="dream-landmark-blueprint" data-source-tone={sourceTone} data-template={preset.template}>
      <div className="dream-landmark-blueprint-icon" aria-hidden="true">
        <span className="dream-landmark-blueprint-symbol">{symbol}</span>
      </div>

      <div className="dream-landmark-blueprint-body">
        <button
          type="button"
          className="dream-landmark-blueprint-name"
          onClick={handleClickName}
          disabled={!canActivate}
          title={
            canActivate && sceneDay !== undefined
              ? `跳转到第 ${sceneDay} 天场景`
              : isCurrentScene
                ? "当前场景已是该预设"
                : preset.name
          }
          aria-label={
            canActivate && sceneDay !== undefined
              ? `跳转到第 ${sceneDay} 天场景：${preset.name}`
              : preset.name
          }
        >
          <Building2 size={13} aria-hidden="true" />
          <strong>{preset.name}</strong>
        </button>

        <div className="dream-landmark-blueprint-meta">
          <span className={`dream-landmark-blueprint-badge dream-landmark-blueprint-badge-${sourceTone}`}>
            <Sparkles size={11} aria-hidden="true" />
            {sourceLabel}
          </span>
          {model ? <small className="dream-landmark-blueprint-model">{model}</small> : null}
          {sceneDay !== undefined ? (
            <small className="dream-landmark-blueprint-scene">
              D{sceneDay}
              {isCurrentScene ? " · 当前场景" : ""}
            </small>
          ) : null}
        </div>

        <div className="dream-landmark-blueprint-chips">
          <span>{primitivesCount} 几何体</span>
          <span>{lightsCount} 灯光</span>
          <span>模板 {preset.template}</span>
          {preset.mood ? <span>气质 {preset.mood}</span> : null}
        </div>

        {preset.notes ? <p className="dream-landmark-blueprint-notes">{preset.notes}</p> : null}
      </div>

      {preset.preview ? (
        <span
          className="dream-landmark-blueprint-thumb"
          style={{ backgroundImage: `url(${preset.preview})` }}
          aria-label={`${preset.name} 预览缩略图`}
          role="img"
        />
      ) : null}
    </div>
  );
}
