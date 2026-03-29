import { create } from "zustand";

const SUMMARY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes stale-while-revalidate

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
      const res = await fetch("/data/timeseries_summary.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
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

  loadPartySummary: async () => {
    try {
      const res = await fetch("/data/party_summary.json");
      if (!res.ok) return;
      const data = await res.json();
      set({ partySummaryData: data });
    } catch {
      // Party data unavailable — not critical
    }
  },

  // ── Detail Cache Slice ───────────────────────────────────────────────
  detailCache: {},
  detailLoading: false,

  fetchDetail: async (date) => {
    const { detailCache } = get();
    if (detailCache[date]) return;

    set({ detailLoading: true });
    try {
      const res = await fetch(`/data/details/${date}.json`);
      if (!res.ok) return;
      const detail = await res.json();
      set((state) => ({
        detailCache: { ...state.detailCache, [date]: detail },
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

  openPanel: (politician, date) => {
    set({ panelOpen: true, selectedPolitician: politician, selectedDate: date });
    get().fetchDetail(date);
  },

  closePanel: () => set({ panelOpen: false }),

  // ── Chart Settings Slice ─────────────────────────────────────────────
  smaMode: "sma7",
  setSmaMode: (mode) => set({ smaMode: mode }),

  // ── Treemap Settings Slice ─────────────────────────────────────────
  // sizeBy: what metric determines block SIZE
  // colorBy: what metric determines block COLOR
  treemapSizeBy: "media_volume", // "media_volume" | "overall_score"
  treemapColorBy: "media_volume", // "overall_score" | "media_volume"
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
