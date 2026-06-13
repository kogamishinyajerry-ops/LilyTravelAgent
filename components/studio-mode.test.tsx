// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { StudioMode } from "./studio-mode";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    })) as unknown as typeof fetch,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("StudioMode demo roadbooks", () => {
  it("starts in the Dali local demo state", () => {
    render(<StudioMode />);

    expect(screen.getByText("云南大理 本地演示")).toBeTruthy();
    expect(screen.getByText("大理 4 天松弛路书")).toBeTruthy();
    expect(screen.getByDisplayValue("云南大理")).toBeTruthy();
  });

  it("switches the 16:9 recording view to the coastal demo roadbook", () => {
    render(<StudioMode />);

    fireEvent.click(screen.getByRole("button", { name: /海岸/ }));

    expect(screen.getByText("三亚海岛 本地演示")).toBeTruthy();
    expect(screen.getByText("三亚海岸 4 天梦境路书")).toBeTruthy();
    expect(screen.getByDisplayValue("三亚海岛")).toBeTruthy();
    expect(screen.getByDisplayValue("三亚")).toBeTruthy();
  });
});
