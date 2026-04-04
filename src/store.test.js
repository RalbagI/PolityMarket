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
    partySummaryData: [],
    _partySummaryFetchedAt: 0,
    _partySummaryFetching: false,
    detailCache: {},
    detailLoading: false,
    panelOpen: false,
    selectedPolitician: null,
    selectedDate: null,
    selectedDetailKey: null,
    smaMode: "sma7",
    signalMode: "media_climate",
    treemapSizeBy: "media_volume",
    treemapColorBy: "market_score",
    volatilityData: null,
    _volatilityFetchedAt: 0,
    _volatilityFetching: false,
  });
});

describe("store — UI slice", () => {
  it("has correct initial state", () => {
    const state = useStore.getState();
    expect(state.panelOpen).toBe(false);
    expect(state.selectedPolitician).toBe(null);
    expect(state.selectedDate).toBe(null);
    expect(state.selectedDetailKey).toBe(null);
  });

  it("openPanel sets politician, date, detail key, and panelOpen", () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => [] });
    globalThis.fetch = mockFetch;

    act(() => useStore.getState().openPanel("Netanyahu", "2026-03-22", "netanyahu"));

    const state = useStore.getState();
    expect(state.panelOpen).toBe(true);
    expect(state.selectedPolitician).toBe("Netanyahu");
    expect(state.selectedDate).toBe("2026-03-22");
    expect(state.selectedDetailKey).toBe("netanyahu");
  });

  it("openPanel skips detail fetch when no detail key is provided", () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    act(() => useStore.getState().openPanel("Likud", "2026-03-22", null));

    expect(mockFetch).not.toHaveBeenCalled();
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

  it("defaults signalMode to media_climate", () => {
    expect(useStore.getState().signalMode).toBe("media_climate");
  });

  it("setSignalMode updates mode", () => {
    act(() => useStore.getState().setSignalMode("consensus_proxy"));
    expect(useStore.getState().signalMode).toBe("consensus_proxy");
  });
});

describe("store — treemap settings", () => {
  it("defaults to media_volume size and market_score color", () => {
    const state = useStore.getState();
    expect(state.treemapSizeBy).toBe("media_volume");
    expect(state.treemapColorBy).toBe("market_score");
  });

  it("setTreemapSizeBy updates sizeBy", () => {
    act(() => useStore.getState().setTreemapSizeBy("market_score"));
    expect(useStore.getState().treemapSizeBy).toBe("market_score");
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

  it("falls back to the full summary artifact when compact is unavailable", async () => {
    const mockData = [{ name: "Fallback", overall_score: 5 }];
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

    await act(() => useStore.getState().loadSummary());

    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, "/data/timeseries_summary.compact.json");
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, "/data/timeseries_summary.json");
    expect(useStore.getState().summaryData).toEqual(mockData);
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

describe("store — loadPartySummary", () => {
  it("fetches and stores party summary data", async () => {
    const mockData = [{ party: "TestParty", overall_score: 5 }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    await act(() => useStore.getState().loadPartySummary());

    expect(useStore.getState().partySummaryData).toEqual(mockData);
  });

  it("skips fetch if party summary data is fresh", async () => {
    useStore.setState({
      partySummaryData: [{ party: "cached" }],
      _partySummaryFetchedAt: Date.now(),
    });

    globalThis.fetch = vi.fn();
    await act(() => useStore.getState().loadPartySummary());

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("store — fetchDetail", () => {
  it("fetches and caches detail for a politician/date pair", async () => {
    const detail = [{ politician_id: "test", name: "Test" }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail[0]),
    });

    await act(() => useStore.getState().fetchDetail("test", "2026-03-22"));

    expect(globalThis.fetch).toHaveBeenCalledWith("/data/details-lite/2026-03-22/test.json");
    expect(useStore.getState().detailCache["2026-03-22::test"]).toEqual(detail);
  });

  it("falls back to the date payload when the per-politician lite file is unavailable", async () => {
    const detail = [{ politician_id: "test", name: "Test" }];
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(detail),
      });

    await act(() => useStore.getState().fetchDetail("test", "2026-03-22"));

    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, "/data/details-lite/2026-03-22/test.json");
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, "/data/details-lite/2026-03-22.json");
    expect(useStore.getState().detailCache["2026-03-22::test"]).toEqual(detail);
  });

  it("skips fetch if politician/date detail is already cached", async () => {
    useStore.setState({ detailCache: { "2026-03-22::test": [{ name: "cached" }] } });
    globalThis.fetch = vi.fn();

    await act(() => useStore.getState().fetchDetail("test", "2026-03-22"));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("store — loadVolatility", () => {
  it("fetches and stores volatility data", async () => {
    const mockData = {
      generated_at: "2026-03-30T02:00:00Z",
      window: 14,
      sigma_threshold: 2,
      politicians: {
        "test-pol": { is_volatile: true, overall_score_sigma: 2.5 },
      },
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    await act(() => useStore.getState().loadVolatility());

    expect(useStore.getState().volatilityData).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith("/data/volatility_data.json");
  });

  it("keeps null on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    await act(() => useStore.getState().loadVolatility());

    expect(useStore.getState().volatilityData).toBeNull();
  });

  it("keeps null on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network"));

    await act(() => useStore.getState().loadVolatility());

    expect(useStore.getState().volatilityData).toBeNull();
  });

  it("defaults to null", () => {
    expect(useStore.getState().volatilityData).toBeNull();
  });

  it("skips fetch if volatility data is fresh", async () => {
    useStore.setState({
      volatilityData: { politicians: {} },
      _volatilityFetchedAt: Date.now(),
    });

    globalThis.fetch = vi.fn();
    await act(() => useStore.getState().loadVolatility());

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
