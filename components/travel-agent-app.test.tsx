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

vi.mock("@/components/roadbook-map", () => ({
  RoadbookMap: () => null,
}));

import { TravelAgentApp } from "./travel-agent-app";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, points: [], configured: false }),
    })) as unknown as typeof fetch,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TravelAgentApp a11y polish", () => {
  it("renders the page main with id=main-content and tabIndex=-1 (skip-link target)", () => {
    render(<TravelAgentApp />);
    const main = document.querySelector<HTMLElement>("main#main-content");
    expect(main).toBeTruthy();
    expect(main!.getAttribute("tabindex")).toBe("-1");
    expect(main!.classList.contains("app-frame")).toBe(true);
  });

  it("renders a non-loading form (no skeleton) in the idle state", () => {
    render(<TravelAgentApp />);
    const skeleton = document.querySelector("[data-testid='roadbook-form-skeleton']");
    expect(skeleton).toBeNull();
    const form = document.querySelector<HTMLFormElement>("form.brief-form");
    expect(form).toBeTruthy();
    // No aria-busy when idle.
    expect(form!.getAttribute("aria-busy")).toBe("false");
    // No .is-loading class when idle.
    expect(form!.classList.contains("is-loading")).toBe(false);
  });

  it("exposes a form skeleton with four bars when the form is busy generating", async () => {
    // Make the fetch hang so the stage stays at "generating" while we assert.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise(() => {
            /* never resolves */
          }),
      ) as unknown as typeof fetch,
    );

    render(<TravelAgentApp />);
    // Submit the form to enter the generating stage.
    const submit = screen.getByRole("button", { name: /生成大理路书/ });
    fireEvent.click(submit);

    const skeleton = await screen.findByTestId("roadbook-form-skeleton");
    expect(skeleton).toBeTruthy();
    expect(skeleton.getAttribute("role")).toBe("status");
    expect(skeleton.getAttribute("aria-live")).toBe("polite");
    expect(skeleton.querySelectorAll(".brief-form-skeleton-bar")).toHaveLength(4);

    // The form should advertise itself as busy so assistive tech can
    // announce the loading state to the user.
    const form = document.querySelector<HTMLFormElement>("form.brief-form");
    expect(form!.getAttribute("aria-busy")).toBe("true");
    expect(form!.classList.contains("is-loading")).toBe(true);
  });
});
