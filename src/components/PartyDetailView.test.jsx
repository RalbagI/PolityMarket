// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PartyDetailView from "./PartyDetailView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => opts.defaultValue || key,
  }),
}));

vi.mock("../store", () => ({
  default: (selector) => {
    const state = {
      summaryData: [
        { date: "2026-03-22", name: "Pol A", party: "Likud", overall_score: 6, media_volume: 5 },
        { date: "2026-03-22", name: "Pol B", party: "Likud", overall_score: 4, media_volume: 3 },
        { date: "2026-03-21", name: "Pol A", party: "Likud", overall_score: 5.5, media_volume: 4 },
        { date: "2026-03-21", name: "Pol B", party: "Likud", overall_score: 4.5, media_volume: 2 },
      ],
    };
    return selector(state);
  },
}));

vi.mock("../lib/colorScale", () => ({
  scoreToColor: () => "rgb(100,200,100)",
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
  localizeParty: (_t, party) => party,
}));

vi.mock("../lib/partyColors", () => ({
  getPartyColor: () => ({ bg: "#1e40af", text: "#dbeafe" }),
}));

const partyData = {
  party: "Likud",
  wing: "right",
  member_count: 2,
  overall_score: 5.3,
  media_volume: 8,
  hostility_avg: 0.3,
  policy_avg: 0.1,
  amplification_avg: 0.5,
  score_stddev: 1.0,
  top_politician: "pol-a",
};

const todayData = [
  { politician_id: "pol-a", name: "Pol A", party: "Likud", overall_score: 6, media_volume: 5 },
  { politician_id: "pol-b", name: "Pol B", party: "Likud", overall_score: 4, media_volume: 3 },
];

describe("PartyDetailView", () => {
  it("renders party name and average score", () => {
    render(<PartyDetailView partyName="Likud" partyData={partyData} todayData={todayData} />);
    expect(screen.getByText("Likud")).toBeInTheDocument();
    expect(screen.getAllByText("5.3").length).toBeGreaterThan(0);
  });

  it("renders member count", () => {
    render(<PartyDetailView partyName="Likud" partyData={partyData} todayData={todayData} />);
    expect(screen.getByText(/2.*partyDetail\.members/)).toBeInTheDocument();
  });

  it("renders score breakdown with dimensional averages", () => {
    render(<PartyDetailView partyName="Likud" partyData={partyData} todayData={todayData} />);
    expect(screen.getByText("0.10")).toBeInTheDocument(); // policy_avg
    expect(screen.getByText("0.30")).toBeInTheDocument(); // hostility_avg
    expect(screen.getByText("0.50")).toBeInTheDocument(); // amplification_avg
  });

  it("renders internal spread (stddev)", () => {
    render(<PartyDetailView partyName="Likud" partyData={partyData} todayData={todayData} />);
    expect(screen.getByText("±1.00")).toBeInTheDocument();
  });

  it("renders member list sorted by media volume", () => {
    render(<PartyDetailView partyName="Likud" partyData={partyData} todayData={todayData} />);
    expect(screen.getByText("Pol A")).toBeInTheDocument();
    expect(screen.getByText("Pol B")).toBeInTheDocument();
    // Pol A (volume 5) should come before Pol B (volume 3)
    const members = screen.getAllByText(/Pol [AB]/);
    expect(members[0].textContent).toBe("Pol A");
  });

  it("renders empty state when no party selected", () => {
    render(<PartyDetailView partyName={null} partyData={null} todayData={[]} />);
    expect(screen.getByText("detailView.empty.selectPolitician")).toBeInTheDocument();
  });
});
