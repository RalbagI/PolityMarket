// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../App";

const openPanelMock = vi.fn();
const closePanelMock = vi.fn();
const loadSummaryMock = vi.fn();
const loadPartySummaryMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => opts.defaultValue || key,
  }),
  withTranslation: () => (Component) => Component,
}));

vi.mock("../store", () => {
  const data = [
    {
      date: "2026-03-21",
      politician_id: "test-pol",
      name: "Test Politician",
      party: "TestParty",
      overall_score: 4.5,
      media_volume: 2,
    },
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
          loadSummary: loadSummaryMock,
          panelOpen: false,
          selectedPolitician: null,
          selectedDate: null,
          detailLoading: false,
          detailCache: {},
          openPanel: openPanelMock,
          closePanel: closePanelMock,
          partySummaryData: [],
          loadPartySummary: loadPartySummaryMock,
          treemapSizeBy: "media_volume",
          treemapColorBy: "overall_score",
          setTreemapSizeBy: vi.fn(),
          setTreemapColorBy: vi.fn(),
          smaMode: "sma7",
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

vi.mock("../lib/normalizeScores", () => ({
  default: (data) => data,
}));

vi.mock("./Sidebar", () => ({
  default: ({ onViewModeChange }) => (
    <button data-testid="switch-parties" onClick={() => onViewModeChange("parties")}>
      switch parties
    </button>
  ),
  SidebarContent: () => <div data-testid="sidebar-content" />,
  useSidebarStats: () => ({ total: 1, weightedAvg: 5.5, histogram: [], maxCount: 1, parties: [] }),
}));

vi.mock("./MethodologyModal", () => ({
  default: () => null,
}));

vi.mock("./CookieConsent", () => ({
  default: () => null,
}));

vi.mock("./TopMoversStrip", () => ({
  default: ({ onSelect }) => (
    <button data-testid="top-mover" onClick={() => onSelect("Test Politician")}>
      select top mover
    </button>
  ),
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
  openPanelMock.mockClear();
  closePanelMock.mockClear();
  loadSummaryMock.mockClear();
  loadPartySummaryMock.mockClear();
});

describe("App party mode interactions", () => {
  it("maps top-mover politician click to party in party mode", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("switch-parties"));
    fireEvent.click(screen.getByTestId("top-mover"));

    expect(openPanelMock).toHaveBeenCalledWith("TestParty", "2026-03-22");
  });
});
