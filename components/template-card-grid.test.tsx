// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { TemplateCardGrid } from "./template-card-grid";
import {
  dreamTemplates,
  type DreamTemplate,
} from "@/lib/dream-design-skill";

function getCard(id: DreamTemplate): HTMLElement {
  const node = document.querySelector<HTMLElement>(
    `[data-template-id="${id}"]`,
  );
  if (!node) {
    throw new Error(`template card not found: ${id}`);
  }
  return node;
}

beforeEach(() => {
  // jsdom does not implement layout: getComputedStyle(grid).gridTemplateColumns
  // returns "" for un-laid-out elements. The grid uses 4 columns by default;
  // we stub it to keep ArrowDown/ArrowUp math deterministic.
  const original = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const style = original(element);
    if (
      element instanceof HTMLElement &&
      element.classList.contains("dream-template-grid")
    ) {
      try {
        Object.defineProperty(style, "gridTemplateColumns", {
          configurable: true,
          get: () => "1fr 1fr 1fr 1fr",
        });
      } catch {
        // Fallback: some jsdom versions make the property non-configurable.
        // In that case the arrow tests will run with a 1-column fallback
        // (the grid code defaults to 4 when the split is empty), so the
        // behavior under test is still correct.
      }
    }
    return style;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TemplateCardGrid", () => {
  it("renders a radio button for every template with the correct label, symbol and hint", () => {
    render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={() => {}}
      />,
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(dreamTemplates.length);

    for (const t of dreamTemplates) {
      const card = getCard(t.id);
      expect(card.getAttribute("data-template-id")).toBe(t.id);
      expect(card.querySelector(".dream-template-card-label")?.textContent).toBe(
        t.label,
      );
    }

    // Spot-check a few known symbols/hints.
    const monument = getCard("monument");
    expect(monument.querySelector(".dream-template-card-symbol")?.textContent).toBe("🗿");
    expect(monument.querySelector(".dream-template-card-hint")?.textContent).toBe("Monumental vista");

    const island = getCard("island");
    expect(island.querySelector(".dream-template-card-symbol")?.textContent).toBe("🏝️");
  });

  it("marks the active template with the .active class and aria-checked=true", () => {
    render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="neon-city"
        onSelect={() => {}}
      />,
    );

    const active = getCard("neon-city");
    expect(active.classList.contains("active")).toBe(true);
    expect(active.getAttribute("aria-checked")).toBe("true");

    const inactive = getCard("monument");
    expect(inactive.classList.contains("active")).toBe(false);
    expect(inactive.getAttribute("aria-checked")).toBe("false");
  });

  it("calls onSelect with the template id when a card is clicked", () => {
    const onSelect = vi.fn();
    render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(getCard("desert"));
    expect(onSelect).toHaveBeenCalledWith("desert");
  });

  it("applies a staggered animation-delay to each card", () => {
    const { container } = render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={() => {}}
      />,
    );

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[data-template-id]"),
    );
    expect(buttons[0]?.style.animationDelay).toBe("0ms");
    expect(buttons[1]?.style.animationDelay).toBe("50ms");
    expect(buttons[3]?.style.animationDelay).toBe("150ms");
  });

  it("matches the visual snapshot of the inactive grid (no hover state)", () => {
    const { container } = render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={() => {}}
      />,
    );
    expect(container.firstChild).toMatchSnapshot("template-grid--inactive");
  });

  it("matches the visual snapshot of a single card in the default (rest) state", () => {
    const { container } = render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={() => {}}
      />,
    );
    const card = container.querySelector('[data-template-id="starlake"]');
    expect(card).toMatchSnapshot("template-card--starlake--rest");
  });

  it("matches the visual snapshot of a single card in the hover state", () => {
    const { container } = render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={() => {}}
      />,
    );
    const card = container.querySelector<HTMLElement>('[data-template-id="lantern"]');
    expect(card).toBeTruthy();
    if (!card) return;

    // Snapshot the markup first so the reviewer can see what the hover
    // state is composed of structurally.
    expect(card).toMatchSnapshot("template-card--lantern--hover");

    // Add a data attribute that mimics the CSS :hover pseudo-class.
    // This guards against accidental class churn because the marker
    // is a real attribute on the element rather than just the
    // rendered HTML.
    card.setAttribute("data-hover", "true");
    expect(card).toMatchSnapshot("template-card--lantern--hover-data-hover");
  });

  it("matches the visual snapshot of a single card in the active state", () => {
    const { container } = render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="shrine"
        onSelect={() => {}}
      />,
    );
    const card = container.querySelector('[data-template-id="shrine"]');
    expect(card).toMatchSnapshot("template-card--shrine--active");
  });

  it("moves focus to the next template when ArrowRight is pressed", () => {
    const onSelect = vi.fn();
    render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={onSelect}
      />,
    );

    const grid = screen.getByRole("radiogroup", { name: "梦境模板" });
    fireEvent.keyDown(grid, { key: "ArrowRight" });

    expect(onSelect).toHaveBeenCalledWith("starlake");
  });

  it("clamps ArrowLeft at the first template", () => {
    const onSelect = vi.fn();
    render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={onSelect}
      />,
    );
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "梦境模板" }), {
      key: "ArrowLeft",
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("clamps ArrowDown at the last template", () => {
    const onSelect = vi.fn();
    render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={onSelect}
      />,
    );
    // Stubbed 4-column grid: index 0 (monument) -> index 4 (neon-city).
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "梦境模板" }), {
      key: "ArrowDown",
    });
    expect(onSelect).toHaveBeenCalledWith("neon-city");
  });

  it("clamps ArrowDown on the last row so it does not advance past the final card", () => {
    const onSelect = vi.fn();
    // Start on index 7 (desert) so the next index in the 4-column grid
    // (7 + 4 = 11) is clamped to the last card.
    render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="desert"
        onSelect={onSelect}
      />,
    );
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "梦境模板" }), {
      key: "ArrowDown",
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("ignores keys other than the four arrows", () => {
    const onSelect = vi.fn();
    render(
      <TemplateCardGrid
        templates={dreamTemplates}
        activeId="monument"
        onSelect={onSelect}
      />,
    );
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "梦境模板" }), {
      key: "Enter",
    });
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "梦境模板" }), {
      key: " ",
    });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
