// M3 (MiniMax-M3) driven LandmarkPreset generator.
//
// The generator turns a roadbook context (current day, mood, template, and
// optionally a ScenicRenderDesign) into a JSON-serialisable LandmarkPreset
// that the Three.js renderer in `components/dream-skyline-scene.tsx` can
// mount directly.
//
// The public surface is intentionally small:
//   - `buildLandmarkPrompt(opts)`   — pure, returns the user message body
//   - `generateLandmarkPreset(opts)` — calls MiniMax-M3, validates, returns
//
// The network path is delegated to the central M3 client
// (`lib/m3-client.ts: callM3Chat`) so retries, timeouts, and error
// classification stay in one place. The generator still owns prompt
// construction, response validation, and stamping the preset with
// `source: 'm3-generated'`. Tests pass an injected `fetchImpl` to
// `callM3Chat`; `globalThis.fetch` is the sensible production default for
// Node 18+ and the browser.

import { extractJsonObject } from "./json-extract";
import { callM3Chat, type M3ChatRequest } from "./m3-client";
import { getM3ErrorMessage } from "./m3-error-classifier";
import type { DayPlan, Roadbook, ScenicRenderDesign } from "./roadbook-types";
import {
  landmarkPresetSchema,
  type LandmarkPreset,
} from "./landmark-preset";
import type { DreamMood, DreamTemplate } from "./dream-design-skill";

/** Inputs for `buildLandmarkPrompt` and `generateLandmarkPreset`. */
export type GenerateLandmarkOptions = {
  roadbook: Roadbook;
  activeDay: number;
  template: DreamTemplate;
  mood: DreamMood;
  /** Optional Scenic Render Skill output — terrain / architecture / lighting cues. */
  scenicDesign?: ScenicRenderDesign;
  /** Explicit API key. Falls back to `process.env.MINIMAX_API_KEY`. */
  apiKey?: string;
  /** Inject a `fetch` implementation (used by tests). */
  fetchImpl?: typeof fetch;
  /** Per-attempt timeout in milliseconds (forwarded to the M3 client). */
  timeoutMs?: number;
  /** Total attempts (1 initial + retries). Forwarded to the M3 client. */
  maxAttempts?: number;
  /** Base backoff delay in milliseconds. Forwarded to the M3 client. */
  baseDelayMs?: number;
  /** Maximum backoff delay in milliseconds. Forwarded to the M3 client. */
  maxDelayMs?: number;
};

/** Result of a successful `generateLandmarkPreset` call. */
export type GenerateLandmarkResult = {
  preset: LandmarkPreset;
  /** The model id the call was made with (e.g. `MiniMax-M3`). */
  model: string;
  /** Whether the preset came from a network response (always `false` today;
   *  reserved for future server-side cache wiring). */
  cached: boolean;
  /** Wall-clock duration of the network call in milliseconds. */
  durationMs: number;
};

/**
 * Find the day plan in the roadbook that matches `activeDay`. Falls back to
 * the first day, then to an empty stub. The generator never throws on
 * missing days because the prompt builder is a pure function.
 */
function findActiveDay(roadbook: Roadbook, activeDay: number): DayPlan | undefined {
  if (roadbook.days.length === 0) return undefined;
  const exact = roadbook.days.find((day) => day.day === activeDay);
  if (exact) return exact;
  return roadbook.days[0];
}

/** Build a compact description of a day for inclusion in the prompt. */
function describeDay(day: DayPlan | undefined): string {
  if (!day) return "（当前没有可用日程）";

  const lines: string[] = [];
  lines.push(`第 ${day.day} 天 · ${day.title || "未命名"}`);
  if (day.area) lines.push(`区域：${day.area}`);
  if (day.mood) lines.push(`当日情绪：${day.mood}`);
  if (day.routeSummary) lines.push(`路线概述：${day.routeSummary}`);
  if (day.stops.length > 0) {
    const stopNames = day.stops
      .map((stop) => stop.name)
      .filter(Boolean)
      .slice(0, 6);
    if (stopNames.length > 0) {
      lines.push(`推荐停留：${stopNames.join("、")}`);
    }
  }
  if (day.food.length > 0) {
    lines.push(`风味：${day.food.join("、")}`);
  }
  if (day.photoTips.length > 0) {
    lines.push(`取景建议：${day.photoTips.join("、")}`);
  }
  return lines.join("\n");
}

/** Render the optional scenic design cues into a prompt fragment. */
function describeScenicDesign(design: ScenicRenderDesign | undefined): string {
  if (!design) return "";

  const lines: string[] = [];
  if (design.sceneTitle) lines.push(`场景标题：${design.sceneTitle}`);
  if (design.terrain.length > 0) lines.push(`地形：${design.terrain.join("、")}`);
  if (design.architecture.length > 0) lines.push(`建筑：${design.architecture.join("、")}`);
  if (design.waterAndVegetation.length > 0) {
    lines.push(`水体与植被：${design.waterAndVegetation.join("、")}`);
  }
  if (design.lighting) lines.push(`光照：${design.lighting}`);
  if (design.camera) lines.push(`镜头：${design.camera}`);
  if (design.materialPalette.length > 0) {
    lines.push(`材质色板：${design.materialPalette.join("、")}`);
  }
  if (design.threeJsPlan.length > 0) {
    lines.push(`建模计划：${design.threeJsPlan.join("；")}`);
  }
  if (lines.length === 0) return "";
  return `\n\nScenic Render Skill 已经生成的建模蓝图：\n${lines.join("\n")}`;
}

/**
 * Build the user message that will be sent to MiniMax-M3. The prompt asks
 * for a strict JSON `LandmarkPreset` object matching the schema documented
 * in `lib/landmark-preset.ts`. Output is intentionally not wrapped in
 * Markdown fences — the model is told to do that, and we strip whatever
 * it adds via `extractJsonObject`.
 */
export function buildLandmarkPrompt(opts: GenerateLandmarkOptions): string {
  const activeDay = findActiveDay(opts.roadbook, opts.activeDay);
  const dayDescription = describeDay(activeDay);
  const scenicFragment = describeScenicDesign(opts.scenicDesign);

  return [
    "你是 LilyTravelAgent 的 Landmark Generator，负责把路书的一天浓缩成一个程序化 3D 地标预设。",
    "你会收到当天的目的地、模板、情绪、区域、停留、风味和取景建议——请基于这些信息产出一个 JSON 描述，供 Three.js 程序化渲染。",
    "",
    "【输出要求】",
    "- 严格输出一个 JSON 对象，不要输出 Markdown 代码块，不要输出额外解释。",
    "- JSON 必须严格匹配下面的 LandmarkPreset Schema：",
    "  {",
    '    "id": "string, 1-120 chars, 全小写 kebab-case，结尾带模板名，例如 lantern-night-01",',
    '    "name": "string, 1-120 chars, 中文短标题",',
    '    "template": "string, 1-60 chars, 与当前梦境模板一致",',
    '    "mood": "string, ≤ 60 chars, 与当前情绪一致，可省略",',
    '    "source": "m3-generated",',
    '    "createdAt": "ISO 8601 datetime 字符串，可省略",',
    '    "version": 1,',
    '    "materials": { "material-id": { "color": "#rrggbb", "roughness": 0..1, "metalness": 0..1, "opacity": 0..1, "side": "front|back|double", "emissive": "#rrggbb", "emissiveIntensity": 0..10 } },',
    '    "primitives": [ { "id": "string", "type": "box|sphere|cylinder|cone|plane|torus|group", "position": [x,y,z], "rotation?": [x,y,z], "scale?": [x,y,z], "size?": [x,y,z], "radius?": number, "segments?": int, "materialId": "string" } ],',
    '    "lights?": [ { "type": "point|directional|ambient", "color": "#rrggbb", "intensity": 0..20, "position?": [x,y,z] } ],',
    '    "notes?": "string, ≤ 800 chars, 用一段中文描述这个地标"',
    "  }",
    "- primitives 至少 1 个、最多 400 个；每个 primitive 必须引用 materials 里真实存在的 materialId。",
    "- colors 必须是 3/6/8 位 hex 字符串，例如 #b8332a。",
    "- 设计原则：3D 单位以米计；地标要聚焦、轮廓清晰；灯光强度要克制；不要写 UI 元素、不要出现文字 logo。",
    "",
    "【输入上下文】",
    `目的地：${opts.roadbook.destination || opts.roadbook.title || "未知目的地"}`,
    `路书标题：${opts.roadbook.title || "未命名"}`,
    `模板：${opts.template}`,
    `情绪：${opts.mood}`,
    "",
    "【当天内容】",
    dayDescription,
    scenicFragment,
    "",
    "【现在请输出严格 JSON】",
  ].join("\n");
}

/**
 * Build the `M3ChatRequest` that `callM3Chat` will dispatch. Kept as a
 * pure helper so tests can assert on the wire shape without standing up
 * a fetch mock.
 */
function buildLandmarkRequest(opts: GenerateLandmarkOptions): M3ChatRequest {
  const model = "MiniMax-M3";
  return {
    model,
    messages: [
      {
        role: "system",
        content:
          "你只返回可解析 JSON。不要输出 Markdown 代码块，不要输出额外解释。",
      },
      {
        role: "user",
        content: buildLandmarkPrompt(opts),
      },
    ],
    temperature: 0.4,
    top_p: 0.9,
    response_format: { type: "json_object" },
  };
}

/**
 * Call MiniMax-M3 with the landmark prompt and return a validated preset.
 *
 * Throws on:
 *   - missing API key (no `MINIMAX_API_KEY` env, no `apiKey` option)
 *   - any classified M3 failure surfaced as `ok: false` (network /
 *     timeout / 4xx / 5xx / parse / schema) — the message is the
 *     user-friendly Chinese string from `getM3ErrorMessage`
 *   - empty / non-JSON content from the model
 *   - JSON that does not validate against `landmarkPresetSchema`
 */
export async function generateLandmarkPreset(
  opts: GenerateLandmarkOptions,
): Promise<GenerateLandmarkResult> {
  const apiKey = opts.apiKey ?? process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error(
      "generateLandmarkPreset: missing API key. Set MINIMAX_API_KEY or pass apiKey in options.",
    );
  }

  const model = "MiniMax-M3";
  const request = buildLandmarkRequest(opts);

  const result = await callM3Chat(request, {
    apiKey,
    // Tests inject fetchImpl through callM3Chat's options; default uses
    // globalThis.fetch inside the client.
    ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
    ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
    ...(opts.maxAttempts !== undefined ? { maxAttempts: opts.maxAttempts } : {}),
    ...(opts.baseDelayMs !== undefined ? { baseDelayMs: opts.baseDelayMs } : {}),
    ...(opts.maxDelayMs !== undefined ? { maxDelayMs: opts.maxDelayMs } : {}),
  });

  if (!result.ok) {
    throw new Error(
      `generateLandmarkPreset: ${getM3ErrorMessage(result.error)}`,
    );
  }

  const content = result.data.content;
  if (!content) {
    throw new Error(
      "generateLandmarkPreset: MiniMax response did not include any content.",
    );
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `generateLandmarkPreset: failed to parse JSON from model output: ${message}`,
    );
  }

  let preset: LandmarkPreset;
  try {
    preset = landmarkPresetSchema.parse(parsed) as LandmarkPreset;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `generateLandmarkPreset: model output failed LandmarkPresetSchema validation: ${message}`,
    );
  }

  // The generator always stamps these two fields — callers should never
  // see `source: 'm3-generated'` from any other path.
  const stamped: LandmarkPreset = {
    ...preset,
    source: "m3-generated",
    template: opts.template,
  };

  return {
    preset: stamped,
    model: result.data.model || model,
    cached: false,
    durationMs: result.totalDurationMs,
  };
}
