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
