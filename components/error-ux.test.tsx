// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  ErrorStateBanner,
  ErrorStateChip,
  FallbackStateNotice,
} from "./error-ux";
import type { M3Error } from "@/lib/m3-error-classifier";

function makeError(overrides: Partial<M3Error> = {}): M3Error {
  return {
    category: "network",
    message: "网络连接失败",
    retryable: true,
    ...overrides,
  };
}

describe("ErrorStateBanner", () => {
  it("renders the localized title and description for the error category", () => {
    render(<ErrorStateBanner error={makeError({ category: "network" })} />);
    expect(screen.getByText("网络异常")).toBeTruthy();
    expect(
      screen.getByText("无法连接到 MiniMax 服务，请检查网络后重试。"),
    ).toBeTruthy();
  });

  it("renders the localized title and description for the auth category", () => {
    render(
      <ErrorStateBanner
        error={makeError({ category: "auth", retryable: false })}
      />,
    );
    expect(screen.getByText("需要配置 API Key")).toBeTruthy();
    expect(
      screen.getByText("未配置或配置错误 MINIMAX_API_KEY。可以继续使用程序化兜底。"),
    ).toBeTruthy();
  });

  it("shows the retry action button for retryable errors", () => {
    render(<ErrorStateBanner error={makeError({ retryable: true })} />);
    // "重试" appears on both the primary action and the inline retry button.
    const buttons = screen.getAllByRole("button", { name: "重试" });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onRetry when the action button is clicked for a retryable error", () => {
    const onRetry = vi.fn();
    render(
      <ErrorStateBanner
        error={makeError({ retryable: true })}
        onRetry={onRetry}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: "重试" });
    fireEvent.click(buttons[0]);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onAction with the recommended action when clicked", () => {
    const onAction = vi.fn();
    render(
      <ErrorStateBanner
        error={makeError({ category: "rate_limit", retryable: true })}
        onAction={onAction}
      />,
    );
    // rate_limit has actionLabel "稍后再试"
    const buttons = screen.getAllByRole("button", { name: "稍后再试" });
    fireEvent.click(buttons[0]);
    expect(onAction).toHaveBeenCalledWith("wait-and-retry");
  });

  it("renders a spinner when retrying is true and the action button is disabled", () => {
    const { container } = render(
      <ErrorStateBanner
        error={makeError({ retryable: true })}
        retrying
      />,
    );
    // The action button keeps its label but is disabled and contains a
    // Loader2 spinner (rendered as an <svg> with class "spin").
    const button = screen.getByRole("button", { name: "重试" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    const spinner = container.querySelector(
      ".error-state-banner__action svg.spin",
    );
    expect(spinner).toBeTruthy();
  });
});

describe("ErrorStateChip", () => {
  it("shows the network label for the network category", () => {
    render(<ErrorStateChip category="network" />);
    expect(screen.getByText("网络")).toBeTruthy();
  });

  it("shows the timeout label for the timeout category", () => {
    render(<ErrorStateChip category="timeout" />);
    expect(screen.getByText("超时")).toBeTruthy();
  });

  it("shows the unknown label for the unknown category", () => {
    render(<ErrorStateChip category="unknown" />);
    expect(screen.getByText("未知")).toBeTruthy();
  });

  it("exposes the category as a data attribute", () => {
    const { container } = render(<ErrorStateChip category="auth" />);
    const chip = container.querySelector(
      '[data-testid="error-state-chip"]',
    );
    expect(chip?.getAttribute("data-category")).toBe("auth");
  });
});

describe("FallbackStateNotice", () => {
  it("renders the fallback title and description", () => {
    render(<FallbackStateNotice />);
    expect(screen.getByText("已使用程序化兜底")).toBeTruthy();
    expect(
      screen.getByText("AI 不可用，已使用本地程序化预置。"),
    ).toBeTruthy();
  });
});
