import { create } from "zustand";

const useStore = create((set, get) => ({
  // ── Summary Data Slice ───────────────────────────────────────────────
  summaryData: [],
  loadError: null,
  setSummaryData: (data) => set({ summaryData: data }),
  setLoadError: (error) => set({ loadError: error }),

  loadSummary: async () => {
    try {
      const res = await fetch("/data/timeseries_summary.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ summaryData: data });
    } catch (err) {
      set({ loadError: err.message });
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
}));

export default useStore;
