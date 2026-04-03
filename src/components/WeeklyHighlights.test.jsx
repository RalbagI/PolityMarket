// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeeklyHighlights from "./WeeklyHighlights";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => {
      const dict = {
        "weeklyHighlights.weekInReview": "סיכום שבועי",
        "weeklyHighlights.topRisers": "עולים השבוע",
        "weeklyHighlights.topFallers": "יורדים השבוע",
        "weeklyHighlights.noMovers": "אין שינויים",
      };
      if (key === "weeklyHighlights.headlineUp")
        return `${options.name} זינק ב-${options.delta}`;
      if (key === "weeklyHighlights.headlineDown")
        return `${options.name} צנח ב-${options.delta}`;
      return dict[key] ?? key;
    },
  }),
}));

vi.mock("./Avatar", () => ({
  default: () => <div data-testid="avatar" />,
}));

const mockStore = vi.fn();
vi.mock("../store", () => ({
  default: (selector) => mockStore(selector),
}));

function makeSummary(days) {
  const rows = [];
  for (const { date, politicians } of days) {
    for (const p of politicians) {
      rows.push({ date, name: p.name, politician_id: p.name.toLowerCase().replace(/ /g, "-"), overall_score: p.score });
    }
  }
  return rows;
}

describe("WeeklyHighlights", () => {
  it("renders headline with biggest weekly mover", () => {
    const summary = makeSummary([
      { date: "2026-03-27", politicians: [{ name: "Alice", score: 3.0 }, { name: "Bob", score: 7.0 }] },
      { date: "2026-04-03", politicians: [{ name: "Alice", score: 6.0 }, { name: "Bob", score: 5.0 }] },
    ]);
    mockStore.mockImplementation((selector) => selector({ summaryData: summary }));

    render(<WeeklyHighlights onSelect={() => {}} />);

    expect(screen.getByText("סיכום שבועי")).toBeInTheDocument();
    // Alice rose +3.0 — name appears in headline + risers list
    expect(screen.getAllByText("politicians.Alice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("+3.0").length).toBeGreaterThanOrEqual(1);
  });

  it("renders top risers and fallers lists", () => {
    const summary = makeSummary([
      { date: "2026-03-27", politicians: [{ name: "Alice", score: 3.0 }, { name: "Bob", score: 7.0 }] },
      { date: "2026-04-03", politicians: [{ name: "Alice", score: 6.0 }, { name: "Bob", score: 5.0 }] },
    ]);
    mockStore.mockImplementation((selector) => selector({ summaryData: summary }));

    render(<WeeklyHighlights onSelect={() => {}} />);

    expect(screen.getByText("עולים השבוע")).toBeInTheDocument();
    expect(screen.getByText("יורדים השבוע")).toBeInTheDocument();
    expect(screen.getByText("-2.0")).toBeInTheDocument();
  });

  it("calls onSelect when headline is clicked", () => {
    const summary = makeSummary([
      { date: "2026-03-27", politicians: [{ name: "Alice", score: 3.0 }] },
      { date: "2026-04-03", politicians: [{ name: "Alice", score: 6.0 }] },
    ]);
    mockStore.mockImplementation((selector) => selector({ summaryData: summary }));
    const onSelect = vi.fn();

    render(<WeeklyHighlights onSelect={onSelect} />);

    // Click the first element with the name (headline card)
    fireEvent.click(screen.getAllByText("politicians.Alice")[0]);
    expect(onSelect).toHaveBeenCalledWith("Alice");
  });

  it("returns null when no summary data", () => {
    mockStore.mockImplementation((selector) => selector({ summaryData: [] }));
    const { container } = render(<WeeklyHighlights onSelect={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
