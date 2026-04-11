// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TreemapLeaf from "./TreemapLeaf";

function renderLeaf(data) {
  return render(
    <TreemapLeaf
      leaf={{
        x0: 0,
        y0: 0,
        x1: 160,
        y1: 120,
        data,
      }}
      displayName={data.displayName || data.name}
      isHovered={false}
      isSelected={false}
      onClick={() => {}}
      onKeyDown={() => {}}
      onTouchEnd={() => {}}
      onMouseEnter={() => {}}
      backgroundColor="rgb(20, 20, 20)"
    />
  );
}

describe("TreemapLeaf", () => {
  it("renders a market score for regular politician leaves", () => {
    renderLeaf({
      politician_id: "regular",
      name: "Regular Leaf",
      market_score: 73.4,
      overall_score: 6.1,
    });

    expect(screen.getByText("73")).toBeInTheDocument();
  });

  it("renders negative delta badge without duplicate minus sign", () => {
    renderLeaf({
      politician_id: "neg-delta",
      name: "Falling Star",
      market_score: 42,
      overall_score: 4.2,
      delta: -3.2,
    });

    expect(screen.getByText("\u25BC3.2")).toBeInTheDocument();
  });

  it("renders positive delta badge with arrow", () => {
    renderLeaf({
      politician_id: "pos-delta",
      name: "Rising Star",
      market_score: 78,
      overall_score: 7.8,
      delta: 5.1,
    });

    expect(screen.getByText("▲5.1")).toBeInTheDocument();
  });

  it("renders drill-down chevron for large tiles", () => {
    const { container } = renderLeaf({
      politician_id: "big-tile",
      name: "Big Politician",
      market_score: 80,
      overall_score: 8.0,
    });
    // area = 160 * 120 = 19200 > 3000, so chevron should render
    const chevron = container.querySelector("[aria-hidden='true'] svg");
    expect(chevron).toBeInTheDocument();
  });

  it("does not render chevron for small tiles", () => {
    const { container } = render(
      <TreemapLeaf
        leaf={{
          x0: 0,
          y0: 0,
          x1: 30,
          y1: 30,
          data: { politician_id: "small", name: "Small", market_score: 50, overall_score: 5 },
        }}
        displayName="Small"
        isHovered={false}
        isSelected={false}
        onClick={() => {}}
        onKeyDown={() => {}}
        onTouchEnd={() => {}}
        onMouseEnter={() => {}}
        backgroundColor="rgb(20, 20, 20)"
      />
    );
    // area = 30 * 30 = 900 < 3000, no chevron
    const svgs = container.querySelectorAll("[aria-hidden='true'] svg");
    expect(svgs.length).toBe(0);
  });

  it("does not render chevron for Others bucket", () => {
    const { container } = renderLeaf({
      politician_id: "__others__",
      name: "__others__",
      displayName: "+5 others",
      market_score: 65,
      overall_score: 6.5,
      _isOthers: true,
    });
    // _isOthers = true → no chevron even if area > 3000
    const chevronContainers = [...container.querySelectorAll("[aria-hidden='true']")].filter((el) =>
      el.querySelector("svg.lucide-chevron-right")
    );
    expect(chevronContainers.length).toBe(0);
  });

  it("does not render a score label for the synthetic Others bucket", () => {
    const { container } = renderLeaf({
      politician_id: "__others__",
      name: "__others__",
      displayName: "+5 נוספים",
      market_score: 65,
      overall_score: 65,
      _isOthers: true,
    });

    expect(screen.getByText("+5 נוספים")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/^650$/);
    expect(container).not.toHaveTextContent("65");
  });

  it("renders the volatile pulse badge when is_volatile is true", () => {
    const { container } = renderLeaf({
      politician_id: "hot",
      name: "Hot Politician",
      market_score: 60,
      overall_score: 6,
      is_volatile: true,
    });
    expect(container.querySelector(".treemap-pulse")).toBeInTheDocument();
  });

  it("omits the pulse badge when is_volatile is false", () => {
    const { container } = renderLeaf({
      politician_id: "calm",
      name: "Calm Politician",
      market_score: 60,
      overall_score: 6,
      is_volatile: false,
    });
    expect(container.querySelector(".treemap-pulse")).not.toBeInTheDocument();
  });

  it("renders a 14-day sparkline svg when scoreSeries14d is provided", () => {
    const { container } = renderLeaf({
      politician_id: "trend",
      name: "Trend Politician",
      market_score: 70,
      overall_score: 7,
      scoreSeries14d: [50, 52, 54, 53, 55, 58, 60, 59, 62, 64, 66, 68, 69, 70],
    });
    const polylines = container.querySelectorAll("polyline");
    expect(polylines.length).toBeGreaterThan(0);
  });

  it("does not render a sparkline when scoreSeries14d is missing or too short", () => {
    const { container } = renderLeaf({
      politician_id: "no-trend",
      name: "No Trend",
      market_score: 60,
      overall_score: 6,
      scoreSeries14d: [50],
    });
    expect(container.querySelectorAll("polyline").length).toBe(0);
  });

  it("renders name without score for medium tiles (name-only tier)", () => {
    // area = 40 * 20 = 800 → between 500 and 1200 → name only, no score
    const { container } = render(
      <TreemapLeaf
        leaf={{
          x0: 0,
          y0: 0,
          x1: 40,
          y1: 20,
          data: { politician_id: "mid", name: "Mid Tile", market_score: 62, overall_score: 6.2 },
        }}
        displayName="Mid Tile"
        isHovered={false}
        isSelected={false}
        onClick={() => {}}
        onKeyDown={() => {}}
        onTouchEnd={() => {}}
        onMouseEnter={() => {}}
        backgroundColor="rgb(20, 20, 20)"
      />
    );

    // Name should be rendered
    expect(screen.getByText("Mid Tile")).toBeInTheDocument();
    // Score (62) should NOT be rendered — color encodes it, tooltip on hover
    expect(container).not.toHaveTextContent("62");
  });
});
