// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./error-boundary";

function Boom(): never {
  throw new Error("boom from child");
}

describe("ErrorBoundary", () => {
  // React logs caught errors to console.error; silence them during these tests.
  const originalError = console.error;
  beforeAll(() => {
    console.error = () => {};
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary title="页面出现错误">
        <div>safe content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe content")).toBeTruthy();
  });

  it("renders fallback with Chinese copy when a child throws", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary
        title="页面出现错误"
        resetLabel="重新加载"
        description="请稍后再试。"
        onError={onError}
      >
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("页面出现错误")).toBeTruthy();
    expect(screen.getByText("请稍后再试。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "重新加载" })).toBeTruthy();
    expect(onError).toHaveBeenCalled();
  });

  it("uses error.message when no description is provided", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("boom from child")).toBeTruthy();
  });

  it("recovers children when reset is clicked", () => {
    let shouldThrow = true;
    function MaybeBoom(): JSX.Element {
      if (shouldThrow) throw new Error("flaky failure");
      return <span>recovered</span>;
    }
    const { rerender } = render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("flaky failure")).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    rerender(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("recovered")).toBeTruthy();
  });
});
