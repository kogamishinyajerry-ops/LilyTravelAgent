import { z } from "zod";
import type { ScenicRenderDesign } from "@/lib/roadbook-types";

export type ScenicRenderSkillInput = {
  destination: string;
  mood?: string;
  template?: string;
  roadbookTitle?: string;
  activeDayTitle?: string;
  activeArea?: string;
};

export const scenicRenderDesignOutputSchema = z.object({
  sceneTitle: z.string().min(1).max(80).catch("目的地电影感预览"),
  destination: z.string().min(1).max(80).catch("目的地"),
  terrain: z.array(z.string().min(1).max(120)).min(1).max(6).catch(["层叠山体", "低角度地平线"]),
  architecture: z.array(z.string().min(1).max(120)).min(1).max(6).catch(["在地建筑体块", "远景地标轮廓"]),
  waterAndVegetation: z
    .array(z.string().min(1).max(120))
    .min(1)
    .max(6)
    .catch(["水面反射", "低饱和植被"]),
  lighting: z.string().min(1).max(180).catch("柔和侧逆光，空气透视明显。"),
  camera: z.string().min(1).max(180).catch("16:9 广角建立镜头，略高机位，前中后景分层。"),
  materialPalette: z
    .array(z.string().min(1).max(80))
    .min(2)
    .max(8)
    .catch(["雾面石材", "微反射水面", "暖色窗光"]),
  threeJsPlan: z
    .array(z.string().min(1).max(140))
    .min(2)
    .max(8)
    .catch(["用山体切片建立真实地形感", "用低多边形体块表达地标轮廓", "用远景贴片增强真实氛围"]),
  imagePrompt: z.string().min(20).max(1400).catch("cinematic destination render, real terrain, local architecture, 16:9"),
  negativePrompt: z
    .array(z.string().min(1).max(120))
    .min(2)
    .max(10)
    .catch(["no text", "no logo", "no watermark", "no distorted architecture"]),
});

export function buildScenicRenderDesignPrompt(input: ScenicRenderSkillInput) {
  const context = [
    `目的地：${input.destination || "未知目的地"}`,
    input.roadbookTitle ? `路书标题：${input.roadbookTitle}` : "",
    input.activeDayTitle ? `当前天：${input.activeDayTitle}` : "",
    input.activeArea ? `当前区域：${input.activeArea}` : "",
    input.template ? `梦境模板：${input.template}` : "",
    input.mood ? `视觉气质：${input.mood}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `你是 LilyTravelAgent 的 Scenic Render Skill，负责把用户上传的景点/风景照片转译成“建模渲染设计蓝图”。

${context}

请观察图片中的真实视觉线索：地形走向、山水关系、建筑轮廓、材质、光照、镜头高度、可作为远景贴片的氛围。

只输出 JSON 对象，不要 Markdown，不要解释。JSON 必须使用以下字段：
{
  "sceneTitle": "最多 18 个汉字，像电影分镜标题",
  "destination": "目的地",
  "terrain": ["2-6 条地形/地势/天际线建模要点"],
  "architecture": ["2-6 条建筑/地标/街巷体块要点"],
  "waterAndVegetation": ["1-6 条水体/植被/天空关系要点"],
  "lighting": "一条光照方案",
  "camera": "一条镜头方案",
  "materialPalette": ["2-8 个材质或颜色词"],
  "threeJsPlan": ["2-8 条给 Three.js 程序化场景执行的建模步骤"],
  "imagePrompt": "英文为主的 16:9 cinematic render prompt，保留照片里的地形/建筑/光线特征，但不要出现文字",
  "negativePrompt": ["不要文字", "不要 logo", "不要水印", "不要扭曲建筑", "不要近景人脸"]
}

约束：
- 不要识别或复现人脸、车牌、可识别私人信息。
- 不要生成地图 pin、UI、字幕、水印、logo。
- 不要承诺这是测绘级真实模型；这是用于旅行前预览的电影感建模渲染蓝图。
- 让结果能同时喂给 Three.js 程序化场景和 MiniMax 图片生成。`;
}

export function normalizeScenicRenderDesign(
  value: unknown,
  input: ScenicRenderSkillInput,
  model: string,
): ScenicRenderDesign {
  const parsed = scenicRenderDesignOutputSchema.parse(value);

  return {
    status: "generated",
    source: "minimax-m3",
    model,
    destination: compact(parsed.destination || input.destination, 80) || input.destination || "目的地",
    sceneTitle: compact(parsed.sceneTitle, 80) || "目的地电影感预览",
    terrain: compactList(parsed.terrain, 6),
    architecture: compactList(parsed.architecture, 6),
    waterAndVegetation: compactList(parsed.waterAndVegetation, 6),
    lighting: compact(parsed.lighting, 180),
    camera: compact(parsed.camera, 180),
    materialPalette: compactList(parsed.materialPalette, 8),
    threeJsPlan: compactList(parsed.threeJsPlan, 8),
    imagePrompt: compact(parsed.imagePrompt, 1400),
    negativePrompt: compactList(parsed.negativePrompt, 10),
    createdAt: new Date().toISOString(),
  };
}

export function buildFallbackScenicRenderDesign(
  input: ScenicRenderSkillInput,
  message: string,
  model = "MiniMax-M3",
): ScenicRenderDesign {
  const destination = input.destination || "目的地";
  const templateTone = resolveTemplateTone(input.template);
  const moodTone = resolveMoodTone(input.mood);

  return {
    status: "fallback",
    source: "local-fallback",
    model,
    destination,
    sceneTitle: `${destination}预览蓝图`,
    terrain: [`${destination}远景地平线`, "层叠山体或城市天际线", "前中后景分层"],
    architecture: ["在地建筑剪影", "低多边形景点体块", "可识别但不过度写实的地标轮廓"],
    waterAndVegetation: ["水面或道路形成视觉引导线", "低饱和植被", "空气透视和薄雾"],
    lighting: `${moodTone}，用侧逆光突出体块边缘。`,
    camera: "16:9 广角建立镜头，略高机位，前景留出路线入口。",
    materialPalette: ["雾面石材", "微反射水面", "暖色窗光", "低饱和天空"],
    threeJsPlan: [
      "用层叠山体切片建立真实地形感",
      "用建筑体块表达景点和街区轮廓",
      "用 AI 远景贴片补充照片级氛围",
      "保留少文字，把画面作为第一信息层",
    ],
    imagePrompt: `cinematic 16:9 destination render of ${destination}, ${templateTone}, ${moodTone}, real-world inspired terrain, recognizable local architecture silhouettes, layered foreground and background, atmospheric haze, premium travel magazine composition, no text, no logo`,
    negativePrompt: ["no text", "no logo", "no watermark", "no map pins", "no close-up faces", "no distorted architecture"],
    message,
    createdAt: new Date().toISOString(),
  };
}

function compactList(values: string[], maxCount: number) {
  return values.map((value) => compact(value, 140)).filter(Boolean).slice(0, maxCount);
}

function compact(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

function resolveTemplateTone(template?: string) {
  if (template === "starlake") return "lake reflections and luminous horizon";
  if (template === "lantern") return "warm evening streets and lantern-like city glow";
  if (template === "snowfield") return "minimal negative space and crisp air";
  return "monumental scenic composition with layered terrain";
}

function resolveMoodTone(mood?: string) {
  if (mood === "dusk") return "warm dusk light";
  if (mood === "geometry") return "precise architectural geometry";
  return "soft airy morning light";
}
