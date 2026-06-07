import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildLandmarkPrompt, generateLandmarkPreset } from "./landmark-generator";
import type { GenerateLandmarkOptions } from "./landmark-generator";
import { landmarkPresetSchema } from "./landmark-preset";
import { sampleRoadbook } from "./sample-roadbook";
import type { ScenicRenderDesign } from "./roadbook-types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleScenicDesign: ScenicRenderDesign = {
  status: "generated",
  source: "minimax-m3",
  model: "MiniMax-M3",
  destination: "云南大理",
  sceneTitle: "洱海晨光",
  terrain: ["层叠远山", "低角度地平线"],
  architecture: ["白族民居剪影", "古塔轮廓"],
  waterAndVegetation: ["湖面反射", "低饱和植被"],
  lighting: "柔和侧逆光，空气透视明显",
  camera: "16:9 广角建立镜头",
  materialPalette: ["雾面石材", "微反射水面"],
  threeJsPlan: ["用山体切片建立地形", "用低多边形体块表达地标"],
  imagePrompt: "cinematic render of Dali",
  negativePrompt: ["no text", "no logo"],
  createdAt: "2026-06-07T00:00:00.000Z",
};

function makeOptions(overrides: Partial<GenerateLandmarkOptions> = {}): GenerateLandmarkOptions {
  return {
    roadbook: sampleRoadbook,
    activeDay: 1,
    template: "lantern",
    mood: "dusk",
    apiKey: "test-key",
    // Pin retry/backoff to one attempt with no delay so failure-path tests
    // surface the underlying M3 error without waiting on the retry loop.
    maxAttempts: 1,
    baseDelayMs: 1,
    maxDelayMs: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

type MockFetchState = {
  requests: Array<{ url: string; body: string; headers?: HeadersInit }>;
  responseBody: unknown;
  status?: number;
  statusText?: string;
  responseText?: string;
  throwOnFetch?: boolean;
};

let mockState: MockFetchState | null = null;

function mockFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (!mockState) throw new Error("mockState not set");
  if (mockState.throwOnFetch) {
    if (mockState.throwOnFetch === "typeerror") {
      return Promise.reject(new TypeError("Failed to fetch"));
    }
    return Promise.reject(new Error("network boom"));
  }

  const body = typeof init.body === "string" ? init.body : "";
  mockState.requests.push({ url, body, headers: init.headers });

  const status = mockState.status ?? 200;
  const statusText = mockState.statusText ?? "OK";
  const responseText = mockState.responseText ?? JSON.stringify(mockState.responseBody);

  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: () => Promise.resolve(responseText),
    json: () => Promise.resolve(JSON.parse(responseText)),
  } as Response);
}

function validPresetPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "lantern-m3-night-01",
    name: "灯火经典",
    template: "lantern",
    mood: "dusk",
    source: "m3-generated",
    version: 1,
    materials: {
      stone: { color: "#e4d7c4", roughness: 0.7 },
      glow: { color: "#ffb35a", emissive: "#ffb35a", emissiveIntensity: 1.4 },
    },
    primitives: [
      {
        id: "lantern-pillar",
        type: "box",
        position: [0, 0.5, 0],
        size: [0.2, 1.0, 0.2],
        materialId: "stone",
      },
      {
        id: "lantern-flame",
        type: "sphere",
        position: [0, 1.2, 0],
        radius: 0.08,
        size: [0.08, 0.08, 0.08],
        materialId: "glow",
      },
    ],
    lights: [
      { type: "point", color: "#ffb35a", intensity: 1.6, position: [0, 1.2, 0] },
    ],
    notes: "两根石柱顶上立着暖色灯火球。",
    ...overrides,
  };
}

function wrapAsChatResponse(content: string) {
  return {
    choices: [
      {
        message: { content },
      },
    ],
    base_resp: { status_code: 0, status_msg: "success" },
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);
  mockState = {
    requests: [],
    responseBody: wrapAsChatResponse(JSON.stringify(validPresetPayload())),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mockState = null;
});

// ---------------------------------------------------------------------------
// buildLandmarkPrompt tests
// ---------------------------------------------------------------------------

describe("buildLandmarkPrompt", () => {
  it("includes the template, mood, and active day content", () => {
    const prompt = buildLandmarkPrompt(makeOptions({ activeDay: 1, template: "lantern", mood: "dusk" }));

    expect(prompt).toContain("模板：lantern");
    expect(prompt).toContain("情绪：dusk");
    // Active day 1 of the sample roadbook is the 古城 area.
    expect(prompt).toContain("大理古城");
    expect(prompt).toContain("风味：");
    expect(prompt).toContain("取景建议：");
    expect(prompt).toContain("JSON");
  });

  it("falls back to the first day when activeDay does not exist", () => {
    const prompt = buildLandmarkPrompt(makeOptions({ activeDay: 99 }));

    // The sample roadbook's day 1 has area "大理古城" — the prompt should
    // still surface that because findActiveDay falls back to days[0].
    expect(prompt).toContain("大理古城");
  });

  it("references the scenic design terrain, architecture, and lighting when provided", () => {
    const prompt = buildLandmarkPrompt(
      makeOptions({ scenicDesign: sampleScenicDesign }),
    );

    expect(prompt).toContain("层叠远山");
    expect(prompt).toContain("白族民居剪影");
    expect(prompt).toContain("柔和侧逆光");
    expect(prompt).toContain("Scenic Render Skill");
  });

  it("omits the scenic design block when not provided", () => {
    const prompt = buildLandmarkPrompt(makeOptions({ scenicDesign: undefined }));

    expect(prompt).not.toContain("Scenic Render Skill");
    expect(prompt).not.toContain("层叠远山");
  });
});

// ---------------------------------------------------------------------------
// generateLandmarkPreset tests
// ---------------------------------------------------------------------------

describe("generateLandmarkPreset", () => {
  it("returns a parsed, schema-valid preset on a happy path", async () => {
    const result = await generateLandmarkPreset(makeOptions());

    // Preset must be valid against the Zod schema.
    const reparsed = landmarkPresetSchema.parse(result.preset);
    expect(reparsed.id).toBe("lantern-m3-night-01");

    // Source is always m3-generated, template is stamped from the input.
    expect(result.preset.source).toBe("m3-generated");
    expect(result.preset.template).toBe("lantern");

    // Result metadata.
    expect(result.model).toBe("MiniMax-M3");
    expect(result.cached).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    // The fetch call was made with the chat completions endpoint, an
    // Authorization header, and a request body that names the model.
    expect(mockState?.requests).toHaveLength(1);
    const request = mockState!.requests[0];
    expect(request.url).toContain("/chat/completions");
    expect(JSON.parse(request.body).model).toBe("MiniMax-M3");
    expect(JSON.parse(request.body).thinking).toBeDefined();
  });

  it("throws when MINIMAX_API_KEY is not set and no apiKey is passed", async () => {
    vi.stubEnv("MINIMAX_API_KEY", "");

    await expect(
      generateLandmarkPreset(
        makeOptions({ apiKey: undefined }),
      ),
    ).rejects.toThrow(/missing API key/i);
  });

  it("throws with details on invalid JSON response content", async () => {
    mockState = {
      requests: [],
      // Response payload that is *not* parseable as a LandmarkPreset —
      // the schema will reject it because the required fields are missing.
      responseBody: wrapAsChatResponse("not a json at all"),
    };

    await expect(generateLandmarkPreset(makeOptions())).rejects.toThrow(
      /failed to parse JSON from model output/,
    );
  });

  it("throws with details on schema-invalid JSON", async () => {
    mockState = {
      requests: [],
      responseBody: wrapAsChatResponse(
        JSON.stringify({ id: "broken", name: 42, template: "lantern" }),
      ),
    };

    await expect(generateLandmarkPreset(makeOptions())).rejects.toThrow(
      /LandmarkPresetSchema validation/,
    );
  });

  it("throws on a non-2xx HTTP response from MiniMax", async () => {
    mockState = {
      requests: [],
      responseBody: { base_resp: { status_code: 1001, status_msg: "rate limited" } },
      status: 429,
      statusText: "Too Many Requests",
    };

    await expect(generateLandmarkPreset(makeOptions())).rejects.toThrow(
      /请求频率过高/,
    );
  });

  it("throws on a non-zero base_resp.status_code with a 200 HTTP", async () => {
    mockState = {
      requests: [],
      responseBody: {
        choices: [{ message: { content: "{}" } }],
        base_resp: { status_code: 1002, status_msg: "auth failed" },
      },
      status: 200,
      statusText: "OK",
    };

    await expect(generateLandmarkPreset(makeOptions())).rejects.toThrow(
      /服务暂时不可用/,
    );
  });

  it("throws on a network failure with the user-friendly message", async () => {
    // Use a TypeError to trigger the network-error classification in
    // classifyM3Error (the same shape as the built-in fetch failure).
    mockState = {
      requests: [],
      responseBody: {},
      throwOnFetch: "typeerror",
    };

    await expect(generateLandmarkPreset(makeOptions())).rejects.toThrow(
      /网络连接失败/,
    );
  });

  it("extracts JSON from content wrapped in markdown fences", async () => {
    const wrapped = "```json\n" + JSON.stringify(validPresetPayload()) + "\n```";
    mockState = {
      requests: [],
      responseBody: wrapAsChatResponse(wrapped),
    };

    const result = await generateLandmarkPreset(makeOptions());
    expect(result.preset.id).toBe("lantern-m3-night-01");
  });

  it("extracts content when the model returns an array of content blocks", async () => {
    // MiniMax can return content as an array of text/image blocks
    mockState = {
      requests: [],
      responseBody: {
        choices: [
          {
            message: {
              content: [
                { type: "text", text: "ignored" },
                { type: "text", text: JSON.stringify(validPresetPayload()) },
                { type: "text", text: "also ignored" },
              ],
            },
          },
        ],
        base_resp: { status_code: 0, status_msg: "success" },
      },
    };

    const result = await generateLandmarkPreset(makeOptions());
    expect(result.preset.id).toBe("lantern-m3-night-01");
  });

  it("extracts content from array with mixed string and object items", async () => {
    mockState = {
      requests: [],
      responseBody: {
        choices: [
          {
            message: {
              content: [
                "plain string prefix",
                { text: JSON.stringify(validPresetPayload()) },
                "plain string suffix",
              ],
            },
          },
        ],
        base_resp: { status_code: 0, status_msg: "success" },
      },
    };

    const result = await generateLandmarkPreset(makeOptions());
    expect(result.preset.id).toBe("lantern-m3-night-01");
  });

  it("throws when the model returns no content at all", async () => {
    mockState = {
      requests: [],
      responseBody: {
        choices: [
          {
            message: { content: null },
          },
        ],
        base_resp: { status_code: 0, status_msg: "success" },
      },
    };

    // The central M3 client surfaces the missing-content error through the
    // generic classification path; the generator wraps it with its own
    // "did not include any content" message after a successful call. With
    // a null content the call fails inside the client, so we expect the
    // unknown-error fallback message instead.
    await expect(generateLandmarkPreset(makeOptions())).rejects.toThrow(
      /未知错误/,
    );
  });

  it("throws when the response body cannot be read as text", async () => {
    // Override the mock fetch to return a Response that throws on text().
    // The central M3 client catches that failure and surfaces it as a
    // classified "unknown" error; the generator re-throws the user-friendly
    // message.
    vi.stubGlobal("fetch", (() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        text: () => Promise.reject(new Error("boom reading body")),
        json: () => Promise.resolve({}),
      } as Response)) as unknown as typeof fetch);

    await expect(generateLandmarkPreset(makeOptions())).rejects.toThrow(
      /未知错误/,
    );
  });

  it("throws when the response body text is empty and JSON fails", async () => {
    vi.stubGlobal("fetch", (() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve(""),
        json: () => { throw new Error("parse error"); },
      } as Response)) as unknown as typeof fetch);

    await expect(generateLandmarkPreset(makeOptions())).rejects.toThrow(
      /未知错误/,
    );
  });

  it("buildLandmarkPrompt handles a roadbook with empty days array without crashing", () => {
    const emptyRoadbook = { ...sampleRoadbook, days: [] };
    const prompt = buildLandmarkPrompt(makeOptions({ roadbook: emptyRoadbook }));
    // Should contain the no-day placeholder and roadbook title/destination
    expect(prompt).toContain("（当前没有可用日程）");
    expect(prompt).toContain("大理");
  });

  it("buildLandmarkPrompt handles a roadbook with a day that has no stops, food, or photoTips", () => {
    const sparseDayRoadbook: typeof sampleRoadbook = {
      ...sampleRoadbook,
      days: [
        { day: 1, title: "Empty Day", area: "nowhere", stops: [], food: [], photoTips: [], mood: undefined, routeSummary: undefined, commuteNote: undefined, budgetNote: undefined },
      ],
    };
    const prompt = buildLandmarkPrompt(makeOptions({ roadbook: sparseDayRoadbook, activeDay: 1 }));
    expect(prompt).toContain("第 1 天");
    expect(prompt).toContain("Empty Day");
    // Should not crash on missing optional fields
  });
});
