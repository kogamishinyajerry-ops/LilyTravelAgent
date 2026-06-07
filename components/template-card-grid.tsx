"use client";

import {
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
  dreamTemplates,
  type DreamTemplate,
} from "@/lib/dream-design-skill";

const dreamTemplateSymbols: Record<DreamTemplate, { symbol: string; hint: string }> = {
  monument: { symbol: "🗿", hint: "Monumental vista" },
  starlake: { symbol: "🌌", hint: "Floating starlake" },
  lantern: { symbol: "🏮", hint: "Lantern-lit streets" },
  snowfield: { symbol: "❄️", hint: "Snowfield silence" },
  "neon-city": { symbol: "🌃", hint: "Neon city night" },
  island: { symbol: "🏝️", hint: "Floating islands" },
  shrine: { symbol: "⛩️", hint: "Quiet shrine" },
  desert: { symbol: "🏜️", hint: "Desert horizons" },
};

export type TemplateCardGridProps = {
  templates: ReadonlyArray<(typeof dreamTemplates)[number]>;
  activeId: DreamTemplate;
  onSelect: (id: DreamTemplate) => void;
};

export function TemplateCardGrid({ templates, activeId, onSelect }: TemplateCardGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown"
    ) {
      return;
    }
    const grid = gridRef.current;
    if (!grid) {
      return;
    }
    const buttons = Array.from(
      grid.querySelectorAll<HTMLButtonElement>("button[data-template-id]"),
    );
    if (buttons.length === 0) {
      return;
    }
    const currentIndex = buttons.findIndex((btn) => btn.dataset.templateId === activeId);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;

    // Determine columns from CSS grid layout (4 columns on wide, 2 on small)
    const computed = window.getComputedStyle(grid);
    const columnCount = computed.gridTemplateColumns.split(" ").filter(Boolean).length || 4;

    let nextIndex = baseIndex;
    if (event.key === "ArrowRight") {
      nextIndex = Math.min(buttons.length - 1, baseIndex + 1);
    } else if (event.key === "ArrowLeft") {
      nextIndex = Math.max(0, baseIndex - 1);
    } else if (event.key === "ArrowDown") {
      nextIndex = Math.min(buttons.length - 1, baseIndex + columnCount);
    } else if (event.key === "ArrowUp") {
      nextIndex = Math.max(0, baseIndex - columnCount);
    }

    event.preventDefault();
    const nextButton = buttons[nextIndex];
    if (nextButton) {
      const nextId = nextButton.dataset.templateId as DreamTemplate | undefined;
      if (nextId && nextId !== activeId) {
        onSelect(nextId);
      }
      nextButton.focus();
    }
  }

  return (
    <div
      ref={gridRef}
      className="dream-template-grid"
      role="radiogroup"
      aria-label="梦境模板"
      onKeyDown={handleKeyDown}
    >
      {templates.map((item, index) => {
        const isActive = activeId === item.id;
        const meta = dreamTemplateSymbols[item.id];
        return (
          <button
            key={item.id}
            type="button"
            data-template-id={item.id}
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`dream-template-card ${isActive ? "active" : ""}`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => onSelect(item.id)}
          >
            <span className="dream-template-card-symbol" aria-hidden="true">
              {meta.symbol}
            </span>
            <strong className="dream-template-card-label">{item.label}</strong>
            <small className="dream-template-card-hint">{meta.hint}</small>
          </button>
        );
      })}
    </div>
  );
}
