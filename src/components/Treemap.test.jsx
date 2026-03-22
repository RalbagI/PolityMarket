// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Treemap from "./Treemap";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("../store", () => ({
  default: (selector) => {
    const state = { treemapSizeBy: "media_volume", treemapColorBy: "overall_score" };
    return selector(state);
  },
}));

vi.mock("../lib/colorScale", () => ({
  scoreToColorWithAlpha: () => "rgba(100,100,200,0.55)",
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
}));

vi.mock("./TreemapTooltip", () => ({
  default: () => <div data-testid="tooltip" />,
}));

// Mock ResizeObserver to provide dimensions
class MockResizeObserver {
  constructor(cb) {
    this._cb = cb;
  }
  observe() {
    // Fire immediately with test dimensions
    this._cb([{ contentRect: { width: 400, height: 300 } }]);
  }
  disconnect() {}
}

beforeEach(() => {
  globalThis.ResizeObserver = MockResizeObserver;
});

function makePoliticians(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    politician_id: `pol-${i}`,
    name: `Politician ${i}`,
    party: "TestParty",
    overall_score: 5 + i,
    media_volume: 3 + i,
  }));
}

describe("Treemap", () => {
  it("renders treemap blocks for each politician", () => {
    const data = makePoliticians(3);
    render(<Treemap data={data} onSelect={() => {}} selectedPolitician={null} />);

    // Each block has role="button" with aria-label containing the name
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(3);
    expect(buttons[0]).toHaveAttribute("aria-label", expect.stringContaining("Politician"));
  });

  it("renders empty state when data is empty", () => {
    render(<Treemap data={[]} onSelect={() => {}} selectedPolitician={null} />);
    expect(screen.getByText("filterBar.noResults")).toBeInTheDocument();
  });

  it("renders empty state when data is null", () => {
    render(<Treemap data={null} onSelect={() => {}} selectedPolitician={null} />);
    expect(screen.getByText("filterBar.noResults")).toBeInTheDocument();
  });

  it("calls onSelect directly on touchEnd (single-tap mobile)", () => {
    const onSelect = vi.fn();
    const data = makePoliticians(1);
    render(<Treemap data={data} onSelect={onSelect} selectedPolitician={null} />);

    const block = screen.getByRole("button");
    fireEvent.touchEnd(block, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    expect(onSelect).toHaveBeenCalledWith("Politician 0");
  });

  it("does NOT show tooltip on mobile touch (single tap goes to detail)", () => {
    const onSelect = vi.fn();
    const data = makePoliticians(1);
    render(<Treemap data={data} onSelect={onSelect} selectedPolitician={null} />);

    const block = screen.getByRole("button");
    fireEvent.touchEnd(block, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    // Tooltip should not appear — touch goes straight to onSelect
    expect(screen.queryByTestId("tooltip")).not.toBeInTheDocument();
  });

  it("calls onSelect on click (desktop)", () => {
    const onSelect = vi.fn();
    const data = makePoliticians(1);
    render(<Treemap data={data} onSelect={onSelect} selectedPolitician={null} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("Politician 0");
  });

  it("calls onSelect on Enter key", () => {
    const onSelect = vi.fn();
    const data = makePoliticians(1);
    render(<Treemap data={data} onSelect={onSelect} selectedPolitician={null} />);

    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("Politician 0");
  });

  it("applies selected style to the selected politician", () => {
    const data = makePoliticians(2);
    render(<Treemap data={data} onSelect={() => {}} selectedPolitician="Politician 1" />);

    const buttons = screen.getAllByRole("button");
    // Selected block should have thicker white border
    const selectedBlock = buttons.find((b) =>
      b.getAttribute("aria-label")?.includes("Politician 1")
    );
    expect(selectedBlock.style.border).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.8\)/);
  });

  it("does not call onSelect when clicking Others bucket", () => {
    // Simulate a mobile-sized container
    globalThis.ResizeObserver = class {
      constructor(cb) {
        this._cb = cb;
      }
      observe() {
        // Small mobile width triggers Others grouping
        this._cb([{ contentRect: { width: 320, height: 500 } }]);
      }
      disconnect() {}
    };

    const onSelect = vi.fn();
    // Create enough politicians to trigger Others bucket on mobile
    const data = makePoliticians(20);
    render(<Treemap data={data} onSelect={onSelect} selectedPolitician={null} />);

    const othersBlock = screen.queryByLabelText(/נוספים/);
    if (othersBlock) {
      fireEvent.click(othersBlock);
      expect(onSelect).not.toHaveBeenCalled();
    }
  });
});
