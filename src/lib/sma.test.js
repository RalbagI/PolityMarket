import { describe, it, expect } from "vitest";
import computeSMA from "./sma";

describe("computeSMA", () => {
  it("returns raw values for window=1", () => {
    expect(computeSMA([1, 2, 3, 4], 1)).toEqual([1, 2, 3, 4]);
  });

  it("computes 3-day SMA correctly", () => {
    const result = computeSMA([1, 2, 3, 4, 5], 3);
    expect(result[0]).toBe(1); // only 1 value
    expect(result[1]).toBe(1.5); // avg(1,2)
    expect(result[2]).toBe(2); // avg(1,2,3)
    expect(result[3]).toBe(3); // avg(2,3,4)
    expect(result[4]).toBe(4); // avg(3,4,5)
  });

  it("handles null values by skipping them", () => {
    const result = computeSMA([1, null, 3], 3);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1); // only [1] is non-null in window
    expect(result[2]).toBe(2); // avg(1, 3)
  });

  it("returns null for all-null window", () => {
    expect(computeSMA([null, null, null], 2)).toEqual([null, null, null]);
  });

  it("returns empty array for empty input", () => {
    expect(computeSMA([], 7)).toEqual([]);
  });

  it("handles window larger than array", () => {
    const result = computeSMA([5, 10], 7);
    expect(result[0]).toBe(5);
    expect(result[1]).toBe(7.5);
  });
});
