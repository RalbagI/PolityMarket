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
});
