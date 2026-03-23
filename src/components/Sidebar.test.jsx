// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import Sidebar from "./Sidebar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => opts.defaultValue || key,
  }),
}));

vi.mock("../store", () => ({
  default: (selector) => {
    const state = {
      treemapSizeBy: "media_volume",
      treemapColorBy: "overall_score",
      setTreemapSizeBy: () => {},
      setTreemapColorBy: () => {},
    };
    return selector(state);
  },
}));

vi.mock("../lib/colorScale", () => ({
  scoreToColor: () => "rgb(100,200,100)",
}));

vi.mock("../lib/localize", () => ({
  localizeParty: (_t, party) => party,
}));

vi.mock("../lib/partyColors", () => ({
  getPartyColor: () => ({ bg: "#1e40af", text: "#dbeafe" }),
}));

vi.mock("./FilterBar", () => ({
  default: () => <div data-testid="filter-bar" />,
}));

const baseFilterProps = {
  visible: [],
  activeParties: [],
  activeWings: [],
  activeSectors: [],
  showLikedOnly: false,
  wingFilter: [],
  partyFilter: [],
  sectorFilter: [],
  likedFilter: false,
  likedIds: [],
  toggleWing: () => {},
  toggleParty: () => {},
  toggleSector: () => {},
  toggleLikedFilter: () => {},
  toggleLiked: () => {},
  clearFilters: () => {},
};

function makePoliticians(count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    politician_id: `pol-${i}`,
    name: `Politician ${i}`,
    party: "TestParty",
    overall_score: 5 + i * 0.5,
    media_volume: 3 + i,
  }));
}

describe("Sidebar mobile top bar", () => {
  it("renders mobile top bar with safe-area-inset-top", () => {
    const { container } = render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
      />
    );

    // Mobile top bar is the md:hidden fixed div
    const mobileBar = container.querySelector(".md\\:hidden.fixed");
    expect(mobileBar).toBeTruthy();
    expect(mobileBar.className).toContain("pt-[env(safe-area-inset-top)]");
    expect(mobileBar.className).toContain("h-[calc(3.5rem+env(safe-area-inset-top))]");
  });

  it("renders PM logo in mobile top bar", () => {
    const { container } = render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
      />
    );

    const mobileBar = container.querySelector(".md\\:hidden.fixed");
    expect(mobileBar.textContent).toContain("PM");
    expect(mobileBar.textContent).toContain("PolityMarket");
  });

  it("wires view mode toggle in mobile drawer", () => {
    const onViewModeChange = vi.fn();
    const { container, getByLabelText } = render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
        viewMode="politicians"
        onViewModeChange={onViewModeChange}
      />
    );

    fireEvent.click(getByLabelText("sidebar.openDrawer"));
    const drawer = container.querySelector(".z-50");
    expect(drawer).toBeTruthy();

    const partiesButton = Array.from(drawer.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("sidebar.viewMode.parties")
    );
    expect(partiesButton).toBeTruthy();

    fireEvent.click(partiesButton);
    expect(onViewModeChange).toHaveBeenCalledWith("parties");
  });
});
