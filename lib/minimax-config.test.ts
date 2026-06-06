import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildMiniMaxChatEndpoint,
  buildMiniMaxImageEndpoint,
  buildMiniMaxScenicChatEndpoint,
  readPositiveIntegerEnv,
  readGenerationMode,
  resolveMiniMaxModel,
  resolveMiniMaxImageModel,
  resolveMiniMaxScenicModel,
  applyMiniMaxThinking,
} from "./minimax-config";

describe("buildMiniMaxChatEndpoint", () => {
  beforeEach(() => {
    vi.stubEnv("MINIMAX_BASE_URL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns default endpoint when no env var set", () => {
    const result = buildMiniMaxChatEndpoint();
    expect(result).toBe("https://api.minimaxi.com/v1/chat/completions");
  });

  it("uses custom base URL when env var is set", () => {
    vi.stubEnv("MINIMAX_BASE_URL", "https://custom.api.example.com");
    const result = buildMiniMaxChatEndpoint();
    expect(result).toBe("https://custom.api.example.com/chat/completions");
  });

  it("strips trailing slashes from base URL", () => {
    vi.stubEnv("MINIMAX_BASE_URL", "https://api.example.com/v1///");
    const result = buildMiniMaxChatEndpoint();
    expect(result).toBe("https://api.example.com/v1/chat/completions");
  });

  it("handles base URL with no path", () => {
    vi.stubEnv("MINIMAX_BASE_URL", "https://api.example.com/");
    const result = buildMiniMaxChatEndpoint();
    expect(result).toBe("https://api.example.com/chat/completions");
  });
});

describe("buildMiniMaxImageEndpoint", () => {
  beforeEach(() => {
    vi.stubEnv("MINIMAX_IMAGE_BASE_URL", undefined);
    vi.stubEnv("MINIMAX_BASE_URL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns default endpoint when no env vars set", () => {
    const result = buildMiniMaxImageEndpoint();
    expect(result).toBe("https://api.minimaxi.com/v1/image_generation");
  });

  it("uses MINIMAX_IMAGE_BASE_URL when set", () => {
    vi.stubEnv("MINIMAX_IMAGE_BASE_URL", "https://image-api.example.com");
    const result = buildMiniMaxImageEndpoint();
    expect(result).toBe("https://image-api.example.com/image_generation");
  });

  it("falls back to MINIMAX_BASE_URL when MINIMAX_IMAGE_BASE_URL not set", () => {
    vi.stubEnv("MINIMAX_BASE_URL", "https://fallback.api.example.com");
    const result = buildMiniMaxImageEndpoint();
    expect(result).toBe("https://fallback.api.example.com/image_generation");
  });

  it("MINIMAX_IMAGE_BASE_URL takes precedence over MINIMAX_BASE_URL", () => {
    vi.stubEnv("MINIMAX_IMAGE_BASE_URL", "https://image-api.example.com");
    vi.stubEnv("MINIMAX_BASE_URL", "https://base-api.example.com");
    const result = buildMiniMaxImageEndpoint();
    expect(result).toBe("https://image-api.example.com/image_generation");
  });

  it("strips trailing slashes from image base URL", () => {
    vi.stubEnv("MINIMAX_IMAGE_BASE_URL", "https://image-api.example.com///");
    const result = buildMiniMaxImageEndpoint();
    expect(result).toBe("https://image-api.example.com/image_generation");
  });
});

describe("buildMiniMaxScenicChatEndpoint", () => {
  beforeEach(() => {
    vi.stubEnv("MINIMAX_SCENIC_ENDPOINT", undefined);
    vi.stubEnv("MINIMAX_SCENIC_BASE_URL", undefined);
    vi.stubEnv("MINIMAX_SCENIC_PATH", undefined);
    vi.stubEnv("MINIMAX_BASE_URL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns scenic endpoint when MINIMAX_SCENIC_ENDPOINT is set", () => {
    vi.stubEnv("MINIMAX_SCENIC_ENDPOINT", "https://scenic.special.api/endpoint");
    const result = buildMiniMaxScenicChatEndpoint();
    expect(result).toBe("https://scenic.special.api/endpoint");
  });

  it("builds from scenic base URL and path when scenic endpoint not set", () => {
    vi.stubEnv("MINIMAX_SCENIC_BASE_URL", "https://scenic.base.example.com");
    vi.stubEnv("MINIMAX_SCENIC_PATH", "custom/path");
    const result = buildMiniMaxScenicChatEndpoint();
    expect(result).toBe("https://scenic.base.example.com/custom/path");
  });

  it("falls back to MINIMAX_BASE_URL when scenic base URL not set", () => {
    vi.stubEnv("MINIMAX_BASE_URL", "https://fallback.example.com");
    const result = buildMiniMaxScenicChatEndpoint();
    expect(result).toBe("https://fallback.example.com/text/chatcompletion_v2");
  });

  it("uses default path when scenic path not set", () => {
    vi.stubEnv("MINIMAX_SCENIC_BASE_URL", "https://scenic.example.com");
    vi.stubEnv("MINIMAX_SCENIC_PATH", undefined);
    const result = buildMiniMaxScenicChatEndpoint();
    expect(result).toBe("https://scenic.example.com/text/chatcompletion_v2");
  });

  it("strips trailing slashes from base URL", () => {
    vi.stubEnv("MINIMAX_SCENIC_BASE_URL", "https://scenic.example.com///");
    vi.stubEnv("MINIMAX_SCENIC_PATH", "path/to/chat");
    const result = buildMiniMaxScenicChatEndpoint();
    expect(result).toBe("https://scenic.example.com/path/to/chat");
  });

  it("strips leading slashes from path", () => {
    vi.stubEnv("MINIMAX_SCENIC_BASE_URL", "https://scenic.example.com");
    vi.stubEnv("MINIMAX_SCENIC_PATH", "///leading/slashes");
    const result = buildMiniMaxScenicChatEndpoint();
    expect(result).toBe("https://scenic.example.com/leading/slashes");
  });
});

describe("readPositiveIntegerEnv", () => {
  beforeEach(() => {
    vi.stubEnv("TEST_INT_VAR", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns fallback when env var is not set", () => {
    const result = readPositiveIntegerEnv("TEST_INT_VAR", 42);
    expect(result).toBe(42);
  });

  it("returns the value when env var is a positive integer", () => {
    vi.stubEnv("TEST_INT_VAR", "100");
    const result = readPositiveIntegerEnv("TEST_INT_VAR", 42);
    expect(result).toBe(100);
  });

  it("returns fallback when env var is zero", () => {
    vi.stubEnv("TEST_INT_VAR", "0");
    const result = readPositiveIntegerEnv("TEST_INT_VAR", 42);
    expect(result).toBe(42);
  });

  it("returns fallback when env var is negative", () => {
    vi.stubEnv("TEST_INT_VAR", "-5");
    const result = readPositiveIntegerEnv("TEST_INT_VAR", 42);
    expect(result).toBe(42);
  });

  it("returns fallback when env var is not a number", () => {
    vi.stubEnv("TEST_INT_VAR", "abc");
    const result = readPositiveIntegerEnv("TEST_INT_VAR", 42);
    expect(result).toBe(42);
  });

  it("returns float value when env var is a positive float (accepts non-integer numbers)", () => {
    vi.stubEnv("TEST_INT_VAR", "3.14");
    const result = readPositiveIntegerEnv("TEST_INT_VAR", 42);
    expect(result).toBe(3.14);
  });

  it("handles large positive integers", () => {
    vi.stubEnv("TEST_INT_VAR", "999999999");
    const result = readPositiveIntegerEnv("TEST_INT_VAR", 42);
    expect(result).toBe(999999999);
  });
});

describe("readGenerationMode", () => {
  it('returns "quality" when value is "quality"', () => {
    expect(readGenerationMode("quality")).toBe("quality");
  });

  it('returns "speed" for any other value', () => {
    expect(readGenerationMode("speed")).toBe("speed");
    expect(readGenerationMode("anything")).toBe("speed");
    expect(readGenerationMode("")).toBe("speed");
  });

  it("returns speed for null and undefined", () => {
    expect(readGenerationMode(null)).toBe("speed");
    expect(readGenerationMode(undefined)).toBe("speed");
  });

  it("returns speed for numbers and objects", () => {
    expect(readGenerationMode(1)).toBe("speed");
    expect(readGenerationMode({})).toBe("speed");
    expect(readGenerationMode([])).toBe("speed");
  });
});

describe("resolveMiniMaxModel", () => {
  beforeEach(() => {
    vi.stubEnv("MINIMAX_QUALITY_MODEL", undefined);
    vi.stubEnv("MINIMAX_MODEL", undefined);
    vi.stubEnv("MINIMAX_FAST_MODEL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns default MiniMax-M3 for "quality" mode', () => {
    expect(resolveMiniMaxModel("quality")).toBe("MiniMax-M3");
  });

  it('returns default MiniMax-M2.7-highspeed for "speed" mode', () => {
    expect(resolveMiniMaxModel("speed")).toBe("MiniMax-M2.7-highspeed");
  });

  it("uses MINIMAX_QUALITY_MODEL env var for quality mode", () => {
    vi.stubEnv("MINIMAX_QUALITY_MODEL", "custom-quality-model");
    expect(resolveMiniMaxModel("quality")).toBe("custom-quality-model");
  });

  it("falls back to MINIMAX_MODEL for quality mode when MINIMAX_QUALITY_MODEL not set", () => {
    vi.stubEnv("MINIMAX_MODEL", "fallback-quality-model");
    expect(resolveMiniMaxModel("quality")).toBe("fallback-quality-model");
  });

  it("uses MINIMAX_FAST_MODEL env var for speed mode", () => {
    vi.stubEnv("MINIMAX_FAST_MODEL", "custom-speed-model");
    expect(resolveMiniMaxModel("speed")).toBe("custom-speed-model");
  });

  it("MINIMAX_QUALITY_MODEL takes precedence over MINIMAX_MODEL for quality mode", () => {
    vi.stubEnv("MINIMAX_QUALITY_MODEL", "quality-specific");
    vi.stubEnv("MINIMAX_MODEL", "generic-model");
    expect(resolveMiniMaxModel("quality")).toBe("quality-specific");
  });
});

describe("resolveMiniMaxImageModel", () => {
  beforeEach(() => {
    vi.stubEnv("MINIMAX_IMAGE_MODEL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns default image-01 when no env var set", () => {
    expect(resolveMiniMaxImageModel()).toBe("image-01");
  });

  it("uses MINIMAX_IMAGE_MODEL when set", () => {
    vi.stubEnv("MINIMAX_IMAGE_MODEL", "custom-image-model");
    expect(resolveMiniMaxImageModel()).toBe("custom-image-model");
  });
});

describe("resolveMiniMaxScenicModel", () => {
  beforeEach(() => {
    vi.stubEnv("MINIMAX_SCENIC_MODEL", undefined);
    vi.stubEnv("MINIMAX_QUALITY_MODEL", undefined);
    vi.stubEnv("MINIMAX_MODEL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns default MiniMax-M3 when no env vars set", () => {
    expect(resolveMiniMaxScenicModel()).toBe("MiniMax-M3");
  });

  it("uses MINIMAX_SCENIC_MODEL when set", () => {
    vi.stubEnv("MINIMAX_SCENIC_MODEL", "scenic-specific-model");
    expect(resolveMiniMaxScenicModel()).toBe("scenic-specific-model");
  });

  it("falls back to MINIMAX_QUALITY_MODEL when MINIMAX_SCENIC_MODEL not set", () => {
    vi.stubEnv("MINIMAX_QUALITY_MODEL", "quality-model");
    expect(resolveMiniMaxScenicModel()).toBe("quality-model");
  });

  it("falls back to MINIMAX_MODEL when MINIMAX_SCENIC_MODEL and MINIMAX_QUALITY_MODEL not set", () => {
    vi.stubEnv("MINIMAX_MODEL", "generic-model");
    expect(resolveMiniMaxScenicModel()).toBe("generic-model");
  });

  it("MINIMAX_SCENIC_MODEL takes precedence over MINIMAX_QUALITY_MODEL", () => {
    vi.stubEnv("MINIMAX_SCENIC_MODEL", "scenic-model");
    vi.stubEnv("MINIMAX_QUALITY_MODEL", "quality-model");
    expect(resolveMiniMaxScenicModel()).toBe("scenic-model");
  });
});

describe("applyMiniMaxThinking", () => {
  beforeEach(() => {
    vi.stubEnv("MINIMAX_THINKING", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("adds thinking config for MiniMax-M3 model", () => {
    const requestBody = { model: "MiniMax-M3" };
    const result = applyMiniMaxThinking(requestBody);
    expect(result.thinking).toEqual({ type: "disabled" });
  });

  it("does not add thinking config for non-M3 models", () => {
    const requestBody = { model: "MiniMax-M2.7-highspeed" };
    const result = applyMiniMaxThinking(requestBody);
    expect(result.thinking).toBeUndefined();
  });

  it("uses MINIMAX_THINKING env var when set", () => {
    vi.stubEnv("MINIMAX_THINKING", "enabled");
    const requestBody = { model: "MiniMax-M3" };
    const result = applyMiniMaxThinking(requestBody);
    expect(result.thinking).toEqual({ type: "enabled" });
  });

  it("returns the same object reference", () => {
    const requestBody = { model: "MiniMax-M3" };
    const result = applyMiniMaxThinking(requestBody);
    expect(result).toBe(requestBody);
  });

  it("works with request body that already has thinking property", () => {
    const requestBody = { model: "MiniMax-M3", thinking: { type: "custom" } };
    const result = applyMiniMaxThinking(requestBody);
    expect(result.thinking).toEqual({ type: "disabled" });
  });

  it("preserves other properties on the request body", () => {
    const requestBody = { model: "MiniMax-M3", temperature: 0.7, top_p: 0.9 };
    const result = applyMiniMaxThinking(requestBody);
    expect(result.temperature).toBe(0.7);
    expect(result.top_p).toBe(0.9);
  });
});
