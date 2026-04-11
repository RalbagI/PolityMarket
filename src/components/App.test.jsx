// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => opts.defaultValue || key,
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
  withTranslation: () => (Component) => Component,
}));

vi.mock("../store", () => {
  const data = [
    {
      date: "2026-03-22",
      politician_id: "test-pol",
      name: "Test Politician",
      party: "TestParty",
      overall_score: 5.5,
      media_volume: 3,
    },
  ];
  return {
    default: Object.assign(
      (selector) => {
        const state = {
          summaryData: data,
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
          partySummaryData: [],
          loadPartySummary: vi.fn(),
          loadVolatility: vi.fn(),
          volatilityData: null,
          loadBottomLines: vi.fn(),
          bottomLines: null,
          treemapLens: "market",
          setTreemapLens: vi.fn(),
          treemapSizeBy: "media_volume",
          treemapColorBy: "media_volume",
          setTreemapSizeBy: vi.fn(),
          setTreemapColorBy: vi.fn(),
          smaMode: "sma7",
          signalMode: "media_climate",
          setSignalMode: vi.fn(),
        };
        return selector(state);
      },
      { getState: () => ({ selectedPolitician: null }) }
    ),
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

// Mock heavy child components — this test focuses on <main> layout structure
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

vi.mock("./DailyInsights", () => ({
  default: () => <div data-testid="daily-insights" />,
}));

// Mock ResizeObserver for Treemap
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
});

describe("App mobile layout", () => {
  it("renders main element with top padding for mobile", () => {
    const { container } = render(<App />);

    const main = container.querySelector("main");
    expect(main).toBeTruthy();
    expect(main.className).toContain("pt-[calc(3.5rem+env(safe-area-inset-top))]");
  });

  it("renders main with md:h-screen for desktop", () => {
    const { container } = render(<App />);

    const main = container.querySelector("main");
    expect(main.className).toContain("md:h-screen");
  });

  it("renders TopMoversStrip instead of chart toggle", () => {
    render(<App />);
    expect(screen.getByTestId("top-movers")).toBeInTheDocument();
  });

  it("keeps daily insights inside the viewport-bounded layout container", () => {
    render(<App />);

    const layoutContainer = screen.getByTestId("daily-insights").parentElement;
    expect(layoutContainer.className).toContain(
      "h-[calc(100vh-(3.5rem+env(safe-area-inset-top)))]"
    );
    expect(layoutContainer).toContainElement(screen.getByTestId("top-movers"));
  });

  it("renders inline sidebar content on mobile", () => {
    render(<App />);
    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
  });
});
