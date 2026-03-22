// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useFilterState from "./useFilterState";

beforeEach(() => {
  // Mock localStorage
  const storage = {};
  vi.stubGlobal("localStorage", {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, val) => {
      storage[key] = String(val);
    },
    removeItem: (key) => {
      delete storage[key];
    },
  });
});

const makePoliticians = () => [
  { politician_id: "a", name: "Pol A", party: "Likud", wing: "right", sector: "secular" },
  { politician_id: "b", name: "Pol B", party: "Labor", wing: "left", sector: "secular" },
  { politician_id: "c", name: "Pol C", party: "Shas", wing: "right", sector: "haredi" },
  { politician_id: "d", name: "Pol D", party: "Raam", wing: "arab", sector: "arab" },
];

describe("useFilterState", () => {
  it("extracts unique parties, wings, and sectors", () => {
    const { result } = renderHook(() => useFilterState(makePoliticians()));
    expect(result.current.parties).toEqual(["Labor", "Likud", "Raam", "Shas"]);
    expect(result.current.wings).toEqual(["arab", "left", "right"]);
    expect(result.current.sectors).toEqual(["arab", "haredi", "secular"]);
  });

  it("shows all politicians when no filters active", () => {
    const { result } = renderHook(() => useFilterState(makePoliticians()));
    expect(result.current.visible.length).toBe(4);
    expect(result.current.visibleCount).toBe(4);
    expect(result.current.totalCount).toBe(4);
  });

  it("filters by wing", () => {
    const { result } = renderHook(() => useFilterState(makePoliticians()));
    act(() => result.current.toggleFilter("wings", "right"));
    expect(result.current.visible.length).toBe(2);
    expect(result.current.visible.map((p) => p.name)).toEqual(["Pol A", "Pol C"]);
  });

  it("filters by party", () => {
    const { result } = renderHook(() => useFilterState(makePoliticians()));
    act(() => result.current.toggleFilter("parties", "Shas"));
    expect(result.current.visible.length).toBe(1);
    expect(result.current.visible[0].name).toBe("Pol C");
  });

  it("filters by sector", () => {
    const { result } = renderHook(() => useFilterState(makePoliticians()));
    act(() => result.current.toggleFilter("sectors", "haredi"));
    expect(result.current.visible.length).toBe(1);
    expect(result.current.visible[0].name).toBe("Pol C");
  });

  it("toggles filter off when clicked again", () => {
    const { result } = renderHook(() => useFilterState(makePoliticians()));
    act(() => result.current.toggleFilter("wings", "right"));
    expect(result.current.visible.length).toBe(2);
    act(() => result.current.toggleFilter("wings", "right"));
    expect(result.current.visible.length).toBe(4);
  });

  it("clears all filters", () => {
    const { result } = renderHook(() => useFilterState(makePoliticians()));
    act(() => result.current.toggleFilter("wings", "right"));
    act(() => result.current.toggleFilter("parties", "Likud"));
    act(() => result.current.clearFilters());
    expect(result.current.visible.length).toBe(4);
    expect(result.current.activeWings).toEqual([]);
    expect(result.current.activeParties).toEqual([]);
  });

  it("toggleLiked adds/removes politician from liked list", () => {
    const { result } = renderHook(() => useFilterState(makePoliticians()));
    act(() => result.current.toggleLiked("a"));
    expect(result.current.likedIds).toEqual(["a"]);
    act(() => result.current.toggleLiked("a"));
    expect(result.current.likedIds).toEqual([]);
  });

  it("showLikedOnly filters to only liked politicians", () => {
    const { result } = renderHook(() => useFilterState(makePoliticians()));
    act(() => result.current.toggleLiked("a"));
    act(() => result.current.toggleFilter("showLikedOnly", true));
    expect(result.current.visible.length).toBe(1);
    expect(result.current.visible[0].name).toBe("Pol A");
  });
});
