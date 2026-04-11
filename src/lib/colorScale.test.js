import { describe, it, expect } from "vitest";
import {
  scoreToColor,
  scoreToColorWithAlpha,
  normalizedScoreToColor,
  normalizedScoreToColorWithAlpha,
  deltaToColor,
  deltaToColorWithAlpha,
} from "./colorScale";

function parseRgbChannels(color) {
  const match = String(color).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return [Number(match?.[1] ?? 0), Number(match?.[2] ?? 0), Number(match?.[3] ?? 0)];
}

describe("scoreToColor", () => {
  it("returns a color string for valid scores", () => {
    const color = scoreToColor(50);
    expect(typeof color).toBe("string");
    expect(color).toMatch(/rgb/);
  });

  it("keeps midpoint scores warm instead of drifting to neutral gray", () => {
    const [r, g, b] = parseRgbChannels(scoreToColor(50));
    expect(r).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(b);
  });

  it("returns red-ish for low scores", () => {
    const color = scoreToColor(0);
    const [r, g] = parseRgbChannels(color);
    expect(r).toBeGreaterThan(g);
  });

  it("returns green-ish for high scores", () => {
    const color = scoreToColor(100);
    const [r, g] = parseRgbChannels(color);
    expect(g).toBeGreaterThan(r);
  });

  it("clamps values outside 0-100", () => {
    expect(() => scoreToColor(-5)).not.toThrow();
    expect(() => scoreToColor(150)).not.toThrow();
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
    expect(scoreToColorWithAlpha(100, 0.5)).toMatch(/^rgba/);
  });
});

describe("normalizedScoreToColor", () => {
  it("maps relative min of range to the darker volume color", () => {
    const [r, g, b] = parseRgbChannels(normalizedScoreToColor(3, 3, 7));
    expect(r).toBeLessThan(b);
    expect(g).toBeLessThan(b);
  });

  it("maps relative max of range to the brighter volume color", () => {
    const [rMin, gMin, bMin] = parseRgbChannels(normalizedScoreToColor(3, 3, 7));
    const [rMax, gMax, bMax] = parseRgbChannels(normalizedScoreToColor(7, 3, 7));
    expect(rMax).toBeGreaterThanOrEqual(rMin);
    expect(gMax).toBeGreaterThan(gMin);
    expect(bMax).toBeGreaterThan(bMin);
  });

  it("maps mid of range to a readable midpoint tint", () => {
    const color = normalizedScoreToColor(5, 3, 7);
    expect(color).toMatch(/rgb/);
  });

  it("handles equal min/max without crashing", () => {
    const color = normalizedScoreToColor(5, 5, 5);
    const [, g, b] = parseRgbChannels(color);
    expect(g).toBeGreaterThan(70);
    expect(b).toBeGreaterThan(90);
  });
});

describe("normalizedScoreToColorWithAlpha", () => {
  it("returns rgba with normalized color", () => {
    const color = normalizedScoreToColorWithAlpha(3, 3, 7, 0.55);
    expect(color).toMatch(/^rgba/);
    expect(color).toContain("0.55");
  });

  it("lowest relative score is darker than the highest one", () => {
    const low = normalizedScoreToColorWithAlpha(4.5, 4.5, 6.0, 0.6);
    const high = normalizedScoreToColorWithAlpha(6.0, 4.5, 6.0, 0.6);
    const [, , bLow] = low.match(/rgba\((\d+),\s*(\d+),\s*(\d+),/).map(Number);
    const [, , bHigh] = high.match(/rgba\((\d+),\s*(\d+),\s*(\d+),/).map(Number);
    expect(bHigh).toBeGreaterThan(bLow);
  });

  it("handles equal min/max with midpoint color", () => {
    const color = normalizedScoreToColorWithAlpha(0, 0, 0, 0.5);
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([^)]+)\)/);
    expect(Number(match?.[2] ?? 0)).toBeGreaterThan(70);
    expect(color).toContain("0.5");
  });
});

describe("deltaToColor", () => {
  it("returns green-dominant color for positive delta", () => {
    const [r, g] = parseRgbChannels(deltaToColor(4, 5));
    expect(g).toBeGreaterThan(r);
  });

  it("returns red-dominant color for negative delta", () => {
    const [r, g] = parseRgbChannels(deltaToColor(-4, 5));
    expect(r).toBeGreaterThan(g);
  });

  it("returns neutral gray for near-zero delta", () => {
    const [r, g, b] = parseRgbChannels(deltaToColor(0.05, 5));
    expect(Math.abs(r - g)).toBeLessThan(30);
    expect(Math.abs(g - b)).toBeLessThan(30);
  });

  it("treats non-finite delta as neutral zero", () => {
    expect(() => deltaToColor(NaN, 5)).not.toThrow();
    expect(() => deltaToColor(undefined, 5)).not.toThrow();
  });

  it("clamps deltas beyond ±maxAbs", () => {
    const capped = deltaToColor(50, 5);
    const extreme = deltaToColor(9999, 5);
    expect(capped).toBe(extreme);
  });
});

describe("deltaToColorWithAlpha", () => {
  it("returns an rgba string with the provided alpha", () => {
    const c = deltaToColorWithAlpha(3, 5, 0.77);
    expect(c).toMatch(/^rgba\(/);
    expect(c).toContain("0.77");
  });
});
