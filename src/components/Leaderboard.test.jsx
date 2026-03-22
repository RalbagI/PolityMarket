// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Leaderboard from "./Leaderboard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => opts.defaultValue || key,
  }),
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

vi.mock("./Avatar", () => ({
  default: () => <div data-testid="avatar" />,
}));

const todayData = [
  { name: "Pol A", party: "PartyA", politician_id: "a", overall_score: 8, media_volume: 5 },
  { name: "Pol B", party: "PartyB", politician_id: "b", overall_score: 3, media_volume: 2 },
  { name: "Pol C", party: "PartyC", politician_id: "c", overall_score: 6, media_volume: 4 },
];

const yesterdayData = [
  { name: "Pol A", overall_score: 7 },
  { name: "Pol B", overall_score: 4 },
];

describe("Leaderboard", () => {
  const defaultProps = {
    todayData,
    yesterdayData: [],
    partyColors: { PartyA: "#1e40af", PartyB: "#b45309", PartyC: "#065f46" },
    onSelect: vi.fn(),
  };

  it("renders all politicians", () => {
    render(<Leaderboard {...defaultProps} />);
    expect(screen.getAllByText("Pol A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pol B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pol C").length).toBeGreaterThan(0);
  });

  it("sorts by score descending by default", () => {
    render(<Leaderboard {...defaultProps} />);
    const scores = screen.getAllByText(/^[0-9]\.[0-9]$/);
    expect(scores[0].textContent).toBe("8.0");
  });

  it("calls onSelect when row is clicked", () => {
    const onSelect = vi.fn();
    render(<Leaderboard {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByText("Pol A")[0]);
    expect(onSelect).toHaveBeenCalledWith("Pol A");
  });

  it("shows delta when yesterday data is available", () => {
    render(<Leaderboard {...defaultProps} yesterdayData={yesterdayData} />);
    expect(screen.getAllByText(/1\.0/).length).toBeGreaterThan(0);
  });
});
