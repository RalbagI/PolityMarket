import { describe, it, expect } from "vitest";
import {
  scoreToColor,
  scoreToColorWithAlpha,
  normalizedScoreToColor,
  normalizedScoreToColorWithAlpha,
} from "./colorScale";

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

describe("normalizedScoreToColor", () => {
  it("maps min of range to red", () => {
    const color = normalizedScoreToColor(3, 3, 7);
    const match = String(color).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(Number(match[1])).toBeGreaterThan(200); // red channel dominant
  });

  it("maps max of range to green/teal", () => {
    const color = normalizedScoreToColor(7, 3, 7);
    const match = String(color).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(Number(match[2])).toBeGreaterThan(100); // green channel
  });

  it("maps mid of range to yellow/orange", () => {
    const color = normalizedScoreToColor(5, 3, 7);
    expect(color).toMatch(/rgb/);
  });

  it("handles equal min/max without crashing", () => {
    expect(() => normalizedScoreToColor(5, 5, 5)).not.toThrow();
  });
});

describe("normalizedScoreToColorWithAlpha", () => {
  it("returns rgba with normalized color", () => {
    const color = normalizedScoreToColorWithAlpha(3, 3, 7, 0.55);
    expect(color).toMatch(/^rgba/);
    expect(color).toContain("0.55");
  });

  it("lowest score is red-ish, highest is green-ish", () => {
    const red = normalizedScoreToColorWithAlpha(4.5, 4.5, 6.0, 0.6);
    const green = normalizedScoreToColorWithAlpha(6.0, 4.5, 6.0, 0.6);
    // Extract red channel from rgba
    const rRed = Number(red.match(/rgba\((\d+)/)[1]);
    const rGreen = Number(green.match(/rgba\((\d+)/)[1]);
    expect(rRed).toBeGreaterThan(rGreen); // red has more red channel
  });
});
