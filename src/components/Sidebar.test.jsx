// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
      treemapColorBy: "media_volume",
      signalMode: "media_climate",
      setTreemapSizeBy: () => {},
      setTreemapColorBy: () => {},
      setSignalMode: () => {},
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

  it("renders brand logo in mobile top bar", () => {
    const { container } = render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
      />
    );

    const mobileBar = container.querySelector(".md\\:hidden.fixed");
    const logo = mobileBar.querySelector('img[alt="PolityMarket logo"]');
    expect(logo).toBeTruthy();
    expect(logo.getAttribute("src")).toBe("/politymarket-mark.svg");
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

describe("Sidebar party mode", () => {
  it("shows 'totalParties' label instead of 'totalTracked' in party mode", () => {
    const { container } = render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
        viewMode="parties"
        onViewModeChange={() => {}}
      />
    );
    // Desktop sidebar content
    const aside = container.querySelector("aside");
    expect(aside.textContent).toContain("sidebar.totalParties");
    expect(aside.textContent).not.toContain("sidebar.totalTracked");
  });

  it("hides party breakdown list in party mode", () => {
    const { container } = render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
        viewMode="parties"
        onViewModeChange={() => {}}
      />
    );
    const aside = container.querySelector("aside");
    expect(aside.textContent).not.toContain("sidebar.partyBreakdown");
  });

  it("shows party breakdown list in politicians mode", () => {
    const { container } = render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
        viewMode="politicians"
        onViewModeChange={() => {}}
      />
    );
    const aside = container.querySelector("aside");
    expect(aside.textContent).toContain("sidebar.partyBreakdown");
  });
});

describe("Sidebar histogram removed", () => {
  it("does not render the score histogram section", () => {
    const { container } = render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
        viewMode="politicians"
        onViewModeChange={() => {}}
      />
    );
    const aside = container.querySelector("aside");
    expect(aside.textContent).not.toContain("sidebar.histogram.title");
  });
});

describe("Sidebar display options position", () => {
  it("renders DisplayOptions before FilterBar in the sidebar", () => {
    const { container } = render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
        viewMode="politicians"
        onViewModeChange={() => {}}
      />
    );
    const aside = container.querySelector("aside");
    const html = aside.innerHTML;
    const displayOptionsPos = html.indexOf("treemap.options.title");
    const filterBarPos = html.indexOf("filter-bar");
    // DisplayOptions should appear before FilterBar in the DOM
    expect(displayOptionsPos).toBeGreaterThan(-1);
    expect(filterBarPos).toBeGreaterThan(-1);
    expect(displayOptionsPos).toBeLessThan(filterBarPos);
  });

  it("renders the market-score legend in positive-to-negative order", () => {
    render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
        viewMode="politicians"
        onViewModeChange={() => {}}
      />
    );

    const legendLabels = screen.getByText("sidebar.colorLegend.positive").parentElement;
    const legendBar = legendLabels?.previousElementSibling;

    expect(legendBar).toBeTruthy();
    expect(legendBar.style.background).toContain("linear-gradient(to right");
  });
});

describe("Sidebar signal availability", () => {
  it("disables consensus toggle when consensus data is unavailable", () => {
    render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
        viewMode="politicians"
        onViewModeChange={() => {}}
        signalMode="media_climate"
        consensusAvailable={false}
      />
    );

    expect(screen.getAllByText("signals.consensusProxy")[0].closest("button")).toBeDisabled();
    expect(screen.getAllByText("signals.consensusUnavailable")[0]).toBeInTheDocument();
  });

  it("enables consensus toggle when consensus data is available", () => {
    render(
      <Sidebar
        todayData={makePoliticians()}
        onMethodologyClick={() => {}}
        filterProps={baseFilterProps}
        viewMode="politicians"
        onViewModeChange={() => {}}
        signalMode="media_climate"
        consensusAvailable={true}
      />
    );

    expect(screen.getAllByText("signals.consensusProxy")[0].closest("button")).not.toBeDisabled();
  });
});
