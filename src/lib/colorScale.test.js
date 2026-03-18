import { describe, it, expect } from "vitest";
import { scoreToColor, scoreToColorWithAlpha } from "./colorScale";

describe("scoreToColor", () => {
  it("returns a color string for valid scores", () => {
    const color = scoreToColor(5);
    expect(typeof color).toBe("string");
    expect(color).toMatch(/rgb/);
  });

  it("returns red-ish for low scores", () => {
    const color = scoreToColor(0);
    expect(color).toMatch(/rgb/);
    // Red channel should be dominant
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(Number(match[1])).toBeGreaterThan(200); // r
  });

  it("returns green-ish for high scores", () => {
    const color = scoreToColor(10);
    expect(color).toMatch(/rgb/);
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(Number(match[2])).toBeGreaterThan(100); // g
  });

  it("clamps values outside 0-10", () => {
    expect(() => scoreToColor(-5)).not.toThrow();
    expect(() => scoreToColor(15)).not.toThrow();
  });
});

describe("scoreToColorWithAlpha", () => {
  it("returns rgba string with default alpha", () => {
    const color = scoreToColorWithAlpha(5);
    expect(color).toMatch(/^rgba\(\d+, \d+, \d+, 0\.6\)$/);
  });

  it("respects custom alpha", () => {
    const color = scoreToColorWithAlpha(5, 0.85);
    expect(color).toMatch(/^rgba\(\d+, \d+, \d+, 0\.85\)$/);
  });

  it("handles boundary scores", () => {
    expect(scoreToColorWithAlpha(0, 0.5)).toMatch(/^rgba/);
    expect(scoreToColorWithAlpha(10, 0.5)).toMatch(/^rgba/);
  });
});
