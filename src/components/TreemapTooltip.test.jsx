// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TreemapTooltip from "./TreemapTooltip";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("../lib/colorScale", () => ({
  scoreToColor: () => "rgb(100,200,100)",
}));

const basePolitician = {
  name: "Test Politician",
  displayName: "Test Politician",
  party: "TestParty",
  displayParty: "TestParty",
  overall_score: 7.5,
  media_volume: 5,
  delta: 0.3,
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
    expect(screen.getByText(/7\.5/)).toBeInTheDocument();
  });

  it("renders delta when present", () => {
    render(<TreemapTooltip politician={basePolitician} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText(/0\.3/)).toBeInTheDocument();
  });

  it("does not render delta when null", () => {
    const noDelta = { ...basePolitician, delta: null };
    render(<TreemapTooltip politician={noDelta} position={{ x: 100, y: 100 }} />);
    // Delta section should not be present
    const deltaElements = screen.queryAllByText(/[+-]/);
    expect(deltaElements.length).toBe(0);
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
