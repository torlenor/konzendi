import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdjustPanel } from "./AdjustPanel";

describe("AdjustPanel", () => {
  it("renders the accepted quick actions in order with accessible names", () => {
    const markup = renderToStaticMarkup(
      createElement(AdjustPanel, {
        effectiveAt: "2026-09-19T10:00:00.000Z",
        disabled: false,
        onRetime: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    const actions = [
      ["−5m", "Move start 5 minutes earlier"],
      ["−10m", "Move start 10 minutes earlier"],
      ["−15m", "Move start 15 minutes earlier"],
      ["−30m", "Move start 30 minutes earlier"],
      ["−1h", "Move start 1 hour earlier"],
    ];

    let previous = -1;
    for (const [label, accessibleName] of actions) {
      const position = markup.indexOf(`aria-label="${accessibleName}"`);
      expect(position).toBeGreaterThan(previous);
      expect(markup.slice(position)).toContain(`>${label}</button>`);
      previous = position;
    }
  });

  it("disables every quick action while storage is busy", () => {
    const markup = renderToStaticMarkup(
      createElement(AdjustPanel, {
        effectiveAt: "2026-09-19T10:00:00.000Z",
        disabled: true,
        onRetime: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    expect(markup.match(/aria-label=/g)).toHaveLength(5);
    expect(markup.match(/disabled=""/g)).toHaveLength(6);
  });
});
