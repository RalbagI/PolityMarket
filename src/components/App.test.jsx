// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import App from "../App";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => opts.defaultValue || key,
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
          detailLoading: false,
          detailCache: {},
          openPanel: vi.fn(),
          closePanel: vi.fn(),
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

// Mock heavy child components — this test focuses on <main> layout structure
vi.mock("./Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));

vi.mock("./MethodologyModal", () => ({
  default: () => null,
}));

vi.mock("./CookieConsent", () => ({
  default: () => null,
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
  it("renders main element with dynamic viewport height for mobile", () => {
    const { container } = render(<App />);

    const main = container.querySelector("main");
    expect(main).toBeTruthy();
    // Should account for top bar + safe-area inset in both vh and dvh variants
    expect(main.className).toContain("h-[calc(100vh-(3.5rem+env(safe-area-inset-top)))]");
    expect(main.className).toContain(
      "supports-[height:100dvh]:h-[calc(100dvh-(3.5rem+env(safe-area-inset-top)))]"
    );
    expect(main.className).toContain("pt-[calc(3.5rem+env(safe-area-inset-top))]");
  });

  it("renders main with md:h-screen for desktop", () => {
    const { container } = render(<App />);

    const main = container.querySelector("main");
    expect(main.className).toContain("md:h-screen");
  });

  it("renders chart toggle button with min-h-[44px] touch target", () => {
    const { container } = render(<App />);

    // The chart toggle button
    const buttons = container.querySelectorAll("button");
    const chartToggle = Array.from(buttons).find((b) => b.className.includes("min-h-[44px]"));
    expect(chartToggle).toBeTruthy();
  });

  it("renders treemap container with min-h-[40vh]", () => {
    const { container } = render(<App />);

    const treemapWrapper = container.querySelector(".min-h-\\[40vh\\]");
    expect(treemapWrapper).toBeTruthy();
  });
});
