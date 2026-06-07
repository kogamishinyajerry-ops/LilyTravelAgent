import { describe, it, expect } from "vitest";
import {
  getErrorUX,
  getFallbackUX,
  type ErrorUIAction,
  type ErrorUXState,
} from "./error-ux";
import type { M3ErrorCategory } from "./m3-error-classifier";

const ALL_CATEGORIES: M3ErrorCategory[] = [
  "network",
  "timeout",
  "rate_limit",
  "server",
  "auth",
  "invalid_request",
  "parse",
  "schema",
  "unknown",
];

const VALID_ACTIONS: ErrorUIAction[] = [
  "retry",
  "configure-api-key",
  "contact-developer",
  "wait-and-retry",
  "check-input",
  "use-fallback",
];

const VALID_SEVERITIES: ErrorUXState["severity"][] = [
  "info",
  "warning",
  "error",
];

describe("getErrorUX", () => {
  it("returns the network UX bundle", () => {
    const ux = getErrorUX("network");
    expect(ux).toEqual({
      title: "网络异常",
      description: "无法连接到 MiniMax 服务，请检查网络后重试。",
      action: "retry",
      actionLabel: "重试",
      severity: "warning",
    });
  });

  it("returns the timeout UX bundle", () => {
    const ux = getErrorUX("timeout");
    expect(ux).toEqual({
      title: "请求超时",
      description: "生成耗时较长已超时，建议稍后重试或简化输入。",
      action: "retry",
      actionLabel: "重试",
      severity: "warning",
    });
  });

  it("returns the rate_limit UX bundle", () => {
    const ux = getErrorUX("rate_limit");
    expect(ux).toEqual({
      title: "请求过快",
      description: "已自动重试，仍受限。请稍候再试。",
      action: "wait-and-retry",
      actionLabel: "稍后再试",
      severity: "info",
    });
  });

  it("returns the server UX bundle", () => {
    const ux = getErrorUX("server");
    expect(ux).toEqual({
      title: "服务暂不可用",
      description: "MiniMax 服务异常，已自动重试多次。",
      action: "wait-and-retry",
      actionLabel: "稍后再试",
      severity: "warning",
    });
  });

  it("returns the auth UX bundle", () => {
    const ux = getErrorUX("auth");
    expect(ux).toEqual({
      title: "需要配置 API Key",
      description:
        "未配置或配置错误 MINIMAX_API_KEY。可以继续使用程序化兜底。",
      action: "configure-api-key",
      actionLabel: "查看配置说明",
      severity: "error",
    });
  });

  it("returns the invalid_request UX bundle", () => {
    const ux = getErrorUX("invalid_request");
    expect(ux).toEqual({
      title: "请求参数错误",
      description: "请检查输入或联系开发者。",
      action: "contact-developer",
      actionLabel: "联系开发者",
      severity: "error",
    });
  });

  it("returns the parse UX bundle", () => {
    const ux = getErrorUX("parse");
    expect(ux).toEqual({
      title: "返回格式异常",
      description: "MiniMax 返回了无法解析的内容。",
      action: "retry",
      actionLabel: "重试",
      severity: "warning",
    });
  });

  it("returns the schema UX bundle", () => {
    const ux = getErrorUX("schema");
    expect(ux).toEqual({
      title: "返回结构异常",
      description: "MiniMax 返回的内容不符合预期格式，请重试。",
      action: "retry",
      actionLabel: "重试",
      severity: "warning",
    });
  });

  it("returns the unknown UX bundle", () => {
    const ux = getErrorUX("unknown");
    expect(ux).toEqual({
      title: "未知错误",
      description: "请稍后重试或联系开发者。",
      action: "retry",
      actionLabel: "重试",
      severity: "error",
    });
  });

  it("every category returns a UX bundle with non-empty required fields", () => {
    for (const category of ALL_CATEGORIES) {
      const ux = getErrorUX(category);
      expect(ux.title.length, `${category} title`).toBeGreaterThan(0);
      expect(ux.description.length, `${category} description`).toBeGreaterThan(0);
      expect(ux.actionLabel.length, `${category} actionLabel`).toBeGreaterThan(0);
      expect(VALID_ACTIONS, `${category} action`).toContain(ux.action);
      expect(VALID_SEVERITIES, `${category} severity`).toContain(ux.severity);
    }
  });

  it("covers exactly the 9 documented M3 categories", () => {
    expect(ALL_CATEGORIES).toHaveLength(9);
    // Sanity: all 9 categories resolve to a bundle without throwing.
    for (const category of ALL_CATEGORIES) {
      expect(() => getErrorUX(category)).not.toThrow();
    }
  });

  it("returns equal bundles on each call for the same category", () => {
    const a = getErrorUX("network");
    const b = getErrorUX("network");
    expect(a).toEqual(b);
  });

  it("returns equal fallback bundles on each call", () => {
    const a = getFallbackUX();
    const b = getFallbackUX();
    expect(a).toEqual(b);
  });
});

describe("getFallbackUX", () => {
  it("returns the expected fallback UX bundle", () => {
    const ux = getFallbackUX();
    expect(ux).toEqual({
      title: "已使用程序化兜底",
      description: "AI 不可用，已使用本地程序化预置。",
      action: "use-fallback",
      actionLabel: "继续",
      severity: "info",
    });
  });

  it("fallback UX has all required non-empty fields", () => {
    const ux = getFallbackUX();
    expect(ux.title.length).toBeGreaterThan(0);
    expect(ux.description.length).toBeGreaterThan(0);
    expect(ux.actionLabel.length).toBeGreaterThan(0);
    expect(VALID_ACTIONS).toContain(ux.action);
    expect(VALID_SEVERITIES).toContain(ux.severity);
  });

  it("fallback UX uses the use-fallback action", () => {
    expect(getFallbackUX().action).toBe("use-fallback");
  });
});
