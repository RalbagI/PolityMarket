// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const annotateMarketTimelineMock = vi.fn((rows) => rows);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => opts.defaultValue || key,
  }),
  withTranslation: () => (Component) => Component,
}));

vi.mock("../store", () => {
  const summaryData = [
    {
      date: "2026-04-04",
      politician_id: "test-pol",
      name: "Test Politician",
      party: "TestParty",
      overall_score: 5.5,
      media_volume: 3,
      market_score: 63.2,
      market_percentile: 60,
      market_tier: "B",
      market_delta_points: 1.2,
      market_delta_pct: 1.9,
    },
  ];

  const partySummaryData = [
    {
      date: "2026-04-04",
      party: "TestParty",
      wing: "center",
      member_count: 1,
      overall_score: 5.5,
      media_volume: 3,
      market_score: 63.2,
      market_percentile: 100,
      market_tier: "B",
      market_delta_points: 1.2,
      market_delta_pct: 1.9,
    },
  ];

  return {
    default: Object.assign(
      (selector) =>
        selector({
          summaryData,
          loadError: null,
          loadSummary: vi.fn(),
          panelOpen: false,
          selectedPolitician: null,
          selectedDate: null,
          selectedDetailKey: null,
          detailLoading: false,
          detailCache: {},
          openPanel: vi.fn(),
          closePanel: vi.fn(),
          partySummaryData,
          loadPartySummary: vi.fn(),
          loadVolatility: vi.fn(),
          volatilityData: null,
          treemapSizeBy: "media_volume",
          treemapColorBy: "market_score",
          setTreemapSizeBy: vi.fn(),
          setTreemapColorBy: vi.fn(),
          smaMode: "sma7",
          signalMode: "media_climate",
          setSignalMode: vi.fn(),
        }),
      { getState: () => ({ selectedPolitician: null }) }
    ),
  };
});

vi.mock("../lib/marketScore", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    annotateMarketTimeline: annotateMarketTimelineMock,
  };
});

vi.mock("../lib/colorScale", () => ({
  scoreToColor: () => "rgb(100,200,100)",
  scoreToColorWithAlpha: () => "rgba(100,200,100,0.55)",
  normalizedScoreToColorWithAlpha: () => "rgba(100,200,100,0.55)",
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
  localizeParty: (_t, party) => party,
}));

vi.mock("../lib/partyColors", () => ({
  getPartyColor: () => ({ bg: "#1e40af", text: "#dbeafe" }),
}));

vi.mock("../lib/useFilterState", () => ({
  default: (data) => ({
    visible: data,
    wingFilter: [],
    partyFilter: [],
    sectorFilter: [],
    likedFilter: false,
    likedIds: [],
    activeWings: [],
    activeParties: [],
    activeSectors: [],
    allWings: [],
    allParties: [],
    allSectors: [],
    toggleWing: () => {},
    toggleParty: () => {},
    toggleSector: () => {},
    toggleLikedFilter: () => {},
    toggleLiked: () => {},
    clearFilters: () => {},
  }),
}));

vi.mock("../lib/useAlertState", () => ({
  default: () => ({
    subscription: null,
    hasSubscription: false,
    isSubscribed: () => false,
    subscribe: vi.fn(),
    togglePolitician: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

vi.mock("../lib/normalizeScores", () => ({
  default: (data) => data,
}));

vi.mock("./Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
  SidebarContent: () => <div data-testid="sidebar-content" />,
}));

vi.mock("../lib/useSidebarStats", () => ({
  default: () => ({ total: 1, weightedAvg: 5.5, histogram: [], maxCount: 1, parties: [] }),
}));

vi.mock("./MethodologyModal", () => ({
  default: () => null,
}));

vi.mock("./CookieConsent", () => ({
  default: () => null,
}));

vi.mock("./TopMoversStrip", () => ({
  default: () => <div data-testid="top-movers" />,
}));

class MockResizeObserver {
  constructor(cb) {
    this._cb = cb;
  }
  observe() {
    this._cb([{ contentRect: { width: 400, height: 300 } }]);
  }
  disconnect() {}
}

beforeEach(() => {
  globalThis.ResizeObserver = MockResizeObserver;
  annotateMarketTimelineMock.mockClear();
});

describe("App market artifact usage", () => {
  it("uses stored market fields without recomputing when summary and party data already include them", async () => {
    const { default: App } = await import("../App");

    render(<App />);

    expect(annotateMarketTimelineMock).not.toHaveBeenCalled();
  });
});
