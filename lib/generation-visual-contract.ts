import type { VisualRenderStrategy } from "@/lib/roadbook-types";

export type VisualGenerationContractInput = {
  visualTemplate?: string;
  visualTemplateLabel?: string;
  renderStrategy?: VisualRenderStrategy;
  directorLens?: string;
  directorLensLabel?: string;
  directorLensPrompt?: string;
};

export function formatVisualGenerationContract(input: VisualGenerationContractInput) {
  return [
    `视觉模板：${input.visualTemplateLabel || input.visualTemplate || "未指定"}`,
    `渲染策略：${formatRenderStrategy(input.renderStrategy)}`,
    `导演镜头：${input.directorLensLabel || input.directorLens || "Auto Director"}`,
    `镜头提示：${input.directorLensPrompt || "跟随当前天数和目的地预设"}`,
  ].join("\n");
}

function formatRenderStrategy(strategy?: VisualRenderStrategy) {
  if (!strategy) {
    return "未指定，使用通用 cinematic 旅行预览。";
  }

  return `lens=${strategy.lens}; surface=${strategy.surface}; motion=${strategy.motion}`;
}
