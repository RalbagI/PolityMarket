// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";

// Fresh store for each test
let useStore;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("./store");
  useStore = mod.default;
  // Reset store state
  useStore.setState({
    summaryData: [],
    loadError: null,
    _summaryFetchedAt: 0,
    _summaryFetching: false,
    detailCache: {},
    detailLoading: false,
    panelOpen: false,
    selectedPolitician: null,
    selectedDate: null,
    smaMode: "sma7",
    treemapSizeBy: "media_volume",
    treemapColorBy: "media_volume",
  });
});

describe("store — UI slice", () => {
  it("has correct initial state", () => {
    const state = useStore.getState();
    expect(state.panelOpen).toBe(false);
    expect(state.selectedPolitician).toBe(null);
    expect(state.selectedDate).toBe(null);
  });

  it("openPanel sets politician, date, and panelOpen", () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => [] });
    globalThis.fetch = mockFetch;

    act(() => useStore.getState().openPanel("Netanyahu", "2026-03-22"));

    const state = useStore.getState();
    expect(state.panelOpen).toBe(true);
    expect(state.selectedPolitician).toBe("Netanyahu");
    expect(state.selectedDate).toBe("2026-03-22");
  });

  it("closePanel sets panelOpen to false", () => {
    useStore.setState({ panelOpen: true });
    act(() => useStore.getState().closePanel());
    expect(useStore.getState().panelOpen).toBe(false);
  });
});

describe("store — chart settings", () => {
  it("defaults to sma7", () => {
    expect(useStore.getState().smaMode).toBe("sma7");
  });

  it("setSmaMode updates mode", () => {
    act(() => useStore.getState().setSmaMode("sma14"));
    expect(useStore.getState().smaMode).toBe("sma14");
  });
});

describe("store — treemap settings", () => {
  it("defaults to media_volume for both size and color", () => {
    const state = useStore.getState();
    expect(state.treemapSizeBy).toBe("media_volume");
    expect(state.treemapColorBy).toBe("media_volume");
  });

  it("setTreemapSizeBy updates sizeBy", () => {
    act(() => useStore.getState().setTreemapSizeBy("overall_score"));
    expect(useStore.getState().treemapSizeBy).toBe("overall_score");
  });

  it("setTreemapColorBy updates colorBy", () => {
    act(() => useStore.getState().setTreemapColorBy("media_volume"));
    expect(useStore.getState().treemapColorBy).toBe("media_volume");
  });
});

describe("store — loadSummary", () => {
  it("fetches and stores summary data", async () => {
    const mockData = [{ name: "Test", overall_score: 5 }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    await act(() => useStore.getState().loadSummary());

    expect(useStore.getState().summaryData).toEqual(mockData);
    expect(useStore.getState().loadError).toBeNull();
  });

  it("sets loadError on fetch failure with no cached data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await act(() => useStore.getState().loadSummary());

    expect(useStore.getState().loadError).toContain("500");
  });

  it("skips fetch if data is fresh (stale-while-revalidate)", async () => {
    useStore.setState({
      summaryData: [{ name: "cached" }],
      _summaryFetchedAt: Date.now(),
    });

    globalThis.fetch = vi.fn();
    await act(() => useStore.getState().loadSummary());

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("force fetches even if data is fresh", async () => {
    useStore.setState({
      summaryData: [{ name: "cached" }],
      _summaryFetchedAt: Date.now(),
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ name: "new" }]),
    });

    await act(() => useStore.getState().loadSummary({ force: true }));
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("dedupes concurrent fetches", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    useStore.setState({ _summaryFetching: true });
    await act(() => useStore.getState().loadSummary());

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("store — fetchDetail", () => {
  it("fetches and caches detail for a date", async () => {
    const detail = [{ politician_id: "test", name: "Test" }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    });

    await act(() => useStore.getState().fetchDetail("2026-03-22"));

    expect(useStore.getState().detailCache["2026-03-22"]).toEqual(detail);
  });

  it("skips fetch if date is already cached", async () => {
    useStore.setState({ detailCache: { "2026-03-22": [{ name: "cached" }] } });
    globalThis.fetch = vi.fn();

    await act(() => useStore.getState().fetchDetail("2026-03-22"));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
