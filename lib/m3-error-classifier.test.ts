import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import {
  classifyM3Error,
  getM3ErrorMessage,
  type M3Error,
} from "./m3-error-classifier";

function makeResponse(status: number): Response {
  return new Response(null, { status });
}

describe("classifyM3Error", () => {
  it("classifies a fetch TypeError as a retryable network error", () => {
    const err = new TypeError("Failed to fetch");
    const result = classifyM3Error(err);
    expect(result.category).toBe("network");
    expect(result.retryable).toBe(true);
    expect(result.message).toBe("网络连接失败，请检查网络后重试");
    expect(result.details).toContain("Failed to fetch");
  });

  it("classifies a Node-style ECONNRESET error as a network error", () => {
    const err = new Error("connection reset") as Error & { code?: string };
    err.code = "ECONNRESET";
    const result = classifyM3Error(err);
    expect(result.category).toBe("network");
    expect(result.retryable).toBe(true);
  });

  it("classifies an AbortError as a retryable timeout", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    const result = classifyM3Error(err);
    expect(result.category).toBe("timeout");
    expect(result.retryable).toBe(true);
    expect(result.message).toBe("请求超时，请稍后重试");
  });

  it("classifies an error whose message mentions timeout as a timeout", () => {
    const err = new Error("Request timeout after 30000ms");
    const result = classifyM3Error(err);
    expect(result.category).toBe("timeout");
    expect(result.retryable).toBe(true);
  });

  it("classifies a 429 response as a retryable rate limit", () => {
    const result = classifyM3Error(undefined, makeResponse(429));
    expect(result.category).toBe("rate_limit");
    expect(result.retryable).toBe(true);
    expect(result.statusCode).toBe(429);
    expect(result.httpStatus).toBe(429);
    expect(result.message).toBe("请求频率过高，已自动重试。请稍候");
  });

  it("classifies 5xx responses as a retryable server error", () => {
    for (const status of [500, 502, 503, 504]) {
      const result = classifyM3Error(undefined, makeResponse(status));
      expect(result.category).toBe("server");
      expect(result.retryable).toBe(true);
      expect(result.statusCode).toBe(status);
      expect(result.httpStatus).toBe(status);
      expect(result.message).toBe("服务暂时不可用，已自动重试");
    }
  });

  it("classifies 401/403 responses as a non-retryable auth error", () => {
    for (const status of [401, 403]) {
      const result = classifyM3Error(undefined, makeResponse(status));
      expect(result.category).toBe("auth");
      expect(result.retryable).toBe(false);
      expect(result.statusCode).toBe(status);
      expect(result.message).toBe(
        "API 密钥无效或已过期，请检查 MINIMAX_API_KEY 配置",
      );
    }
  });

  it("classifies a 400 response as a non-retryable invalid request", () => {
    const result = classifyM3Error(undefined, makeResponse(400));
    expect(result.category).toBe("invalid_request");
    expect(result.retryable).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("请求参数有误，请联系开发者");
  });

  it("classifies a JSON parse SyntaxError as a non-retryable parse error", () => {
    const err = new SyntaxError("Unexpected token < in JSON at position 0");
    const result = classifyM3Error(err);
    expect(result.category).toBe("parse");
    expect(result.retryable).toBe(false);
    expect(result.message).toBe(
      "返回内容不是有效 JSON，请重试或简化输入",
    );
    expect(result.details).toContain("Unexpected token");
  });

  it("classifies a ZodError as a non-retryable schema error", () => {
    const err = new ZodError([
      {
        code: "invalid_type",
        path: ["title"],
        message: "title is required",
      },
    ]);
    const result = classifyM3Error(err);
    expect(result.category).toBe("schema");
    expect(result.retryable).toBe(false);
    expect(result.message).toBe("返回内容不符合预期结构，请重试");
  });

  it("classifies an unknown error as non-retryable unknown", () => {
    const result = classifyM3Error("something weird happened");
    expect(result.category).toBe("unknown");
    expect(result.retryable).toBe(false);
    expect(result.message).toBe("未知错误，请稍后重试或联系开发者");
  });

  it("prefers timeout over an unrelated response status", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    const result = classifyM3Error(err, makeResponse(503));
    expect(result.category).toBe("timeout");
    expect(result.retryable).toBe(true);
  });
});

describe("getM3ErrorMessage", () => {
  it("returns the localized Chinese message for each category", () => {
    const cases: Array<[M3Error["category"], string]> = [
      ["network", "网络连接失败，请检查网络后重试"],
      ["timeout", "请求超时，请稍后重试"],
      ["rate_limit", "请求频率过高，已自动重试。请稍候"],
      ["server", "服务暂时不可用，已自动重试"],
      ["auth", "API 密钥无效或已过期，请检查 MINIMAX_API_KEY 配置"],
      ["invalid_request", "请求参数有误，请联系开发者"],
      ["parse", "返回内容不是有效 JSON，请重试或简化输入"],
      ["schema", "返回内容不符合预期结构，请重试"],
      ["unknown", "未知错误，请稍后重试或联系开发者"],
    ];
    for (const [category, expected] of cases) {
      const error: M3Error = { category, message: expected, retryable: false };
      expect(getM3ErrorMessage(error)).toBe(expected);
    }
  });
});
