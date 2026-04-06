// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TreemapTooltip from "./TreemapTooltip";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
}));

vi.mock("../lib/colorScale", () => ({
  scoreToColor: () => "rgb(100,200,100)",
  scoreToColorWithAlpha: () => "rgba(100,200,100,0.3)",
}));

const basePolitician = {
  name: "Test Politician",
  displayName: "Test Politician",
  party: "TestParty",
  displayParty: "TestParty",
  overall_score: 7.5,
  market_score: 75,
  market_tier: "A",
  market_percentile: 82,
  media_volume: 5,
  market_delta_points: 2.3,
  market_delta_pct: 3.1,
};

describe("TreemapTooltip", () => {
  it("renders null when politician is null", () => {
    const { container } = render(
      <TreemapTooltip politician={null} position={{ x: 100, y: 100 }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders politician name and party", () => {
    render(<TreemapTooltip politician={basePolitician} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText("Test Politician")).toBeInTheDocument();
    expect(screen.getByText("TestParty")).toBeInTheDocument();
  });

  it("renders score", () => {
    render(<TreemapTooltip politician={basePolitician} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("A-Tier")).toBeInTheDocument();
    expect(screen.getByText("P82")).toBeInTheDocument();
  });

  it("renders delta when present", () => {
    render(<TreemapTooltip politician={basePolitician} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText(/\+2\.3/)).toBeInTheDocument();
    expect(screen.getByText(/\(\+3\.1%\)/)).toBeInTheDocument();
  });

  it("does not render delta when null", () => {
    const noDelta = { ...basePolitician, market_delta_points: null, market_delta_pct: null };
    render(<TreemapTooltip politician={noDelta} position={{ x: 100, y: 100 }} />);
    expect(screen.queryByText("treemap.tooltip.change")).not.toBeInTheDocument();
  });

  it("has pointer-events-none to not block clicks", () => {
    const { container } = render(
      <TreemapTooltip politician={basePolitician} position={{ x: 100, y: 100 }} />
    );
    const tooltip = container.firstChild;
    expect(tooltip.className).toContain("pointer-events-none");
  });

  it("uses fixed positioning", () => {
    const { container } = render(
      <TreemapTooltip politician={basePolitician} position={{ x: 100, y: 100 }} />
    );
    const tooltip = container.firstChild;
    expect(tooltip.className).toContain("fixed");
  });
});
