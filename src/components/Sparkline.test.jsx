// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Sparkline from "./Sparkline";

describe("Sparkline", () => {
  it("renders an SVG with a polyline for valid data", () => {
    const { container } = render(<Sparkline data={[10, 20, 15, 25, 30]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const polyline = container.querySelector("polyline");
    expect(polyline).toBeInTheDocument();
    expect(polyline.getAttribute("points")).toBeTruthy();
  });

  it("renders nothing for empty data", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders nothing for single data point", () => {
    const { container } = render(<Sparkline data={[42]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("applies green color for upward trend when no color prop", () => {
    const { container } = render(<Sparkline data={[10, 20, 30]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline.getAttribute("stroke")).toBe("#34d399");
  });

  it("applies red color for downward trend when no color prop", () => {
    const { container } = render(<Sparkline data={[30, 20, 10]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline.getAttribute("stroke")).toBe("#fb7185");
  });

  it("applies gray color for flat trend when no color prop", () => {
    const { container } = render(<Sparkline data={[10, 10]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline.getAttribute("stroke")).toBe("#6b7280");
  });

  it("uses custom color when provided", () => {
    const { container } = render(<Sparkline data={[10, 20, 30]} color="#ff0000" />);
    const polyline = container.querySelector("polyline");
    expect(polyline.getAttribute("stroke")).toBe("#ff0000");
  });

  it("respects custom width and height", () => {
    const { container } = render(<Sparkline data={[10, 20, 30]} width={100} height={40} />);
    const svg = container.querySelector("svg");
    expect(svg.getAttribute("width")).toBe("100");
    expect(svg.getAttribute("height")).toBe("40");
  });

  it("renders a fill polygon below the line", () => {
    const { container } = render(<Sparkline data={[10, 20, 30]} />);
    const polygon = container.querySelector("polygon");
    expect(polygon).toBeInTheDocument();
  });

  it("filters out non-finite values", () => {
    const { container } = render(<Sparkline data={[10, null, NaN, 20, undefined, 30]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).toBeInTheDocument();
    // 3 valid points → polyline should have content
    expect(polyline.getAttribute("points")).toBeTruthy();
  });

  it("is hidden from screen readers", () => {
    const { container } = render(<Sparkline data={[10, 20, 30]} />);
    const svg = container.querySelector("svg");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });
});
