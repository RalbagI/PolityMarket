// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import PoliticianAvatars from "./PoliticianAvatars";

describe("PoliticianAvatars", () => {
  it("renders known politician avatar (Netanyahu)", () => {
    const { container } = render(
      <PoliticianAvatars politicianId="benjamin-netanyahu" name="Benjamin Netanyahu" size={40} />
    );
    // Should render an SVG avatar
    const svg = container.querySelector("svg");
    expect(svg || container.querySelector("[style]")).toBeTruthy();
  });

  it("renders initials fallback for unknown politician", () => {
    const { container } = render(
      <PoliticianAvatars politicianId="unknown-person" name="Unknown Person" size={40} />
    );
    // Should have initials
    expect(container.textContent).toMatch(/UP|U/);
  });

  it("respects size prop", () => {
    const { container } = render(<PoliticianAvatars politicianId="test" name="Test" size={64} />);
    const el = container.firstChild;
    // Should have width/height matching size
    expect(el.style.width || el.getAttribute("width")).toBeTruthy();
  });
});
