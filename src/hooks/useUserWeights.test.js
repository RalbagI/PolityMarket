// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useUserWeights from "./useUserWeights";
import { BALANCED_WEIGHTS, DIM_KEYS } from "../utils/rescoring";

describe("useUserWeights", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("politymarket-user-weights");
    } catch {
      // test env without localStorage — hook falls back to in-memory state
    }
  });

  it("initializes with the Balanced preset", () => {
    const { result } = renderHook(() => useUserWeights());
    for (const key of DIM_KEYS) {
      expect(result.current.weights[key]).toBeCloseTo(BALANCED_WEIGHTS[key], 5);
    }
    const sum = DIM_KEYS.reduce((s, k) => s + result.current.normalized[k], 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("setWeight updates one dimension and renormalizes", () => {
    const { result } = renderHook(() => useUserWeights());
    act(() => result.current.setWeight("dim_public_sentiment", 0.9));
    expect(result.current.weights.dim_public_sentiment).toBeCloseTo(0.9, 5);
    const sum = DIM_KEYS.reduce((s, k) => s + result.current.normalized[k], 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("reset restores the Balanced preset", () => {
    const { result } = renderHook(() => useUserWeights());
    act(() => result.current.setWeight("dim_public_sentiment", 0.9));
    act(() => result.current.reset());
    expect(result.current.weights).toEqual(BALANCED_WEIGHTS);
  });

  it("ignores invalid setWeight inputs", () => {
    const { result } = renderHook(() => useUserWeights());
    act(() => result.current.setWeight("dim_public_sentiment", -5));
    expect(result.current.weights.dim_public_sentiment).toBe(0);
    act(() => result.current.setWeight("not_a_dim", 1));
    expect(result.current.weights.not_a_dim).toBeUndefined();
  });
});
