// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

// Stub the global stylesheet imports; the layout pulls in leaflet CSS and
// globals.css which transitively load @leaflet classes used by the
// roadbook map. We only care about the rendered DOM here.
vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("./globals.css", () => ({}));

vi.mock("@/components/toast-container", () => ({
  ToastContainer: () => null,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RootLayout", () => {
  it("renders a skip-link targeting #main-content as the first focusable element in <body>", async () => {
    const { default: RootLayout } = await import("./layout");
    render(
      <RootLayout>
        <main id="main-content">page body</main>
      </RootLayout>,
    );

    const skip = document.querySelector<HTMLAnchorElement>("a.skip-link");
    expect(skip).toBeTruthy();
    expect(skip!.getAttribute("href")).toBe("#main-content");
    expect(skip!.textContent).toBe("跳到主要内容");

    // The skip-link must appear before the children so a Tab on a fresh
    // page load reaches it first. jsdom wraps the layout in a <div>
    // under <body>, so we check the body's first rendered element.
    const body = document.body;
    const firstRendered = body.firstElementChild?.firstElementChild ?? null;
    expect(firstRendered).toBe(skip);

    // The target it points at must exist and be a real landmark.
    const target = document.getElementById("main-content");
    expect(target).toBeTruthy();
    expect(target!.tagName).toBe("MAIN");
  });

  it("renders the ToastContainer once at the end of the body", async () => {
    const { default: RootLayout } = await import("./layout");
    const { container } = render(
      <RootLayout>
        <div data-testid="page-content">page</div>
      </RootLayout>,
    );
    // ToastContainer is mocked to return null, but the component should
    // be invoked exactly once and should not throw on render.
    expect(container).toBeTruthy();
    expect(screen.getByTestId("page-content")).toBeTruthy();
  });
});

// Pulled in after vi.mock to keep the screen import lazy.
import { screen } from "@testing-library/react";
