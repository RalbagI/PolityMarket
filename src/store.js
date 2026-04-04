import { create } from "zustand";

const SUMMARY_CACHE_TTL = 60 * 60 * 1000; // 1 hour stale-while-revalidate for daily data
const PARTY_SUMMARY_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours, changes at most daily
const VOLATILITY_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours, generated offline
const DATE_DETAIL_CACHE_KEY = "__date__";

function buildDetailCacheKey(date, detailKey = DATE_DETAIL_CACHE_KEY) {
  return `${date}::${detailKey}`;
}

async function fetchJsonWithFallback(paths) {
  let lastError = new Error("fetch failed");

  for (const url of paths) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function normalizeDetailPayload(payload) {
  if (Array.isArray(payload)) return payload;
  return payload ? [payload] : [];
}

const useStore = create((set, get) => ({
  // ── Summary Data Slice (with caching) ──────────────────────────────
  summaryData: [],
  loadError: null,
  _summaryFetchedAt: 0,
  _summaryFetching: false,

  loadSummary: async ({ force = false } = {}) => {
    const state = get();

    // Skip if already fetching (deduping)
    if (state._summaryFetching) return;

    // Skip if fresh and not forced
    if (
      !force &&
      state.summaryData.length &&
      Date.now() - state._summaryFetchedAt < SUMMARY_CACHE_TTL
    ) {
      return;
    }

    set({ _summaryFetching: true });
    try {
      const data = await fetchJsonWithFallback([
        "/data/timeseries_summary.compact.json",
        "/data/timeseries_summary.json",
      ]);
      set({ summaryData: data, _summaryFetchedAt: Date.now(), loadError: null });
    } catch (err) {
      // Only set error if no cached data — stale-while-revalidate
      if (!get().summaryData.length) {
        set({ loadError: err.message });
      }
    } finally {
      set({ _summaryFetching: false });
    }
  },

  // ── Party Summary Slice ─────────────────────────────────────────────
  partySummaryData: [],
  _partySummaryFetchedAt: 0,
  _partySummaryFetching: false,

  loadPartySummary: async ({ force = false } = {}) => {
    const state = get();
    if (state._partySummaryFetching) return;
    if (
      !force &&
      state.partySummaryData.length &&
      Date.now() - state._partySummaryFetchedAt < PARTY_SUMMARY_CACHE_TTL
    ) {
      return;
    }

    set({ _partySummaryFetching: true });
    try {
      const res = await fetch("/data/party_summary.json");
      if (!res.ok) return;
      const data = await res.json();
      set({ partySummaryData: data, _partySummaryFetchedAt: Date.now() });
    } catch {
      // Party data unavailable — not critical
    } finally {
      set({ _partySummaryFetching: false });
    }
  },

  // ── Detail Cache Slice ───────────────────────────────────────────────
  detailCache: {},
  detailLoading: false,

  fetchDetail: async (detailKeyOrDate, maybeDate) => {
    const detailKey = maybeDate ? detailKeyOrDate : DATE_DETAIL_CACHE_KEY;
    const date = maybeDate ?? detailKeyOrDate;
    const cacheKey = buildDetailCacheKey(date, detailKey);
    const { detailCache } = get();
    if (detailCache[cacheKey]) return;
    const dateCacheKey = buildDetailCacheKey(date, DATE_DETAIL_CACHE_KEY);
    if (detailKey !== DATE_DETAIL_CACHE_KEY && detailCache[dateCacheKey]) {
      set((state) => ({
        detailCache: { ...state.detailCache, [cacheKey]: state.detailCache[dateCacheKey] },
      }));
      return;
    }

    set({ detailLoading: true });
    try {
      const detail = normalizeDetailPayload(
        await fetchJsonWithFallback(
          detailKey === DATE_DETAIL_CACHE_KEY
            ? [`/data/details-lite/${date}.json`, `/data/details/${date}.json`]
            : [
                `/data/details-lite/${date}/${encodeURIComponent(detailKey)}.json`,
                `/data/details-lite/${date}.json`,
                `/data/details/${date}.json`,
              ]
        )
      );
      set((state) => ({
        detailCache: {
          ...state.detailCache,
          [cacheKey]: detail,
          ...(detailKey !== DATE_DETAIL_CACHE_KEY && detail.length > 1
            ? { [dateCacheKey]: detail }
            : {}),
        },
      }));
    } catch {
      // Detail fetch failed
    } finally {
      set({ detailLoading: false });
    }
  },

  // ── UI Slice ─────────────────────────────────────────────────────────
  panelOpen: false,
  selectedPolitician: null,
  selectedDate: null,
  selectedDetailKey: null,

  openPanel: (politician, date, detailKey = null) => {
    set({
      panelOpen: true,
      selectedPolitician: politician,
      selectedDate: date,
      selectedDetailKey: detailKey,
    });
    if (detailKey) {
      get().fetchDetail(detailKey, date);
    }
  },

  closePanel: () => set({ panelOpen: false }),

  // ── Chart Settings Slice ─────────────────────────────────────────────
  smaMode: "sma7",
  setSmaMode: (mode) => set({ smaMode: mode }),

  signalMode: "media_climate",
  setSignalMode: (mode) => set({ signalMode: mode }),

  // ── Volatility Data Slice ──────────────────────────────────────────
  volatilityData: null,
  _volatilityFetchedAt: 0,
  _volatilityFetching: false,

  loadVolatility: async ({ force = false } = {}) => {
    const state = get();
    if (state._volatilityFetching) return;
    if (
      !force &&
      state.volatilityData &&
      Date.now() - state._volatilityFetchedAt < VOLATILITY_CACHE_TTL
    ) {
      return;
    }

    set({ _volatilityFetching: true });
    try {
      const res = await fetch("/data/volatility_data.json");
      if (!res.ok) return;
      const data = await res.json();
      set({ volatilityData: data, _volatilityFetchedAt: Date.now() });
    } catch {
      // Volatility data unavailable — not critical
    } finally {
      set({ _volatilityFetching: false });
    }
  },

  // ── Treemap Settings Slice ─────────────────────────────────────────
  // sizeBy: what metric determines block SIZE
  // colorBy: what metric determines block COLOR
  treemapSizeBy: "media_volume", // "media_volume" | "market_score"
  treemapColorBy: "market_score", // "market_score" | "media_volume"
  setTreemapSizeBy: (v) => set({ treemapSizeBy: v }),
  setTreemapColorBy: (v) => set({ treemapColorBy: v }),
}));

// Background refetch on window focus (stale-while-revalidate)
// Guard against duplicate listeners during HMR
if (typeof window !== "undefined" && !window.__politymarket_visibility_listener) {
  window.__politymarket_visibility_listener = true;
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      useStore.getState().loadSummary();
    }
  });
}

export default useStore;
