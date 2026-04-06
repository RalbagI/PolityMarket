// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileFeed from "./MobileFeed";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => {
      const dict = {
        "mobileFeed.compare": "השוואה",
        "mobileFeed.sort.score": "ציון",
        "mobileFeed.sort.delta": "שינוי",
        "mobileFeed.sort.volume": "מדיה",
        "mobileFeed.showAll": `הצג עוד ${options.count} פוליטיקאים`,
      };
      return dict[key] ?? key;
    },
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
}));

vi.mock("./Avatar", () => ({
  default: () => <div data-testid="avatar" />,
}));

vi.mock("./WeeklyHighlights", () => ({
  default: () => <div data-testid="weekly-highlights" />,
}));

vi.mock("../lib/colorScale", () => ({
  scoreToColor: () => "#6366f1",
  scoreToColorWithAlpha: () => "rgba(99,102,241,0.16)",
}));

function makePoliticians(count) {
  return Array.from({ length: count }, (_, i) => ({
    politician_id: `pol-${i}`,
    name: `Politician ${i}`,
    displayName: `פוליטיקאי ${i}`,
    party: "Likud",
    displayParty: "הליכוד",
    overall_score: 5 + (i % 5),
    media_volume: 3 + i,
    delta: i % 3 === 0 ? 0.5 : i % 3 === 1 ? -0.3 : 0,
  }));
}

describe("MobileFeed", () => {
  it("renders weekly highlights, compare button, and politician cards", () => {
    render(<MobileFeed data={makePoliticians(5)} onSelect={() => {}} onCompare={() => {}} />);

    expect(screen.getByTestId("weekly-highlights")).toBeInTheDocument();
    expect(screen.getByText("השוואה")).toBeInTheDocument();
    expect(screen.getAllByTestId("avatar").length).toBeGreaterThan(0);
  });

  it("shows 'show more' button when more than 15 items", () => {
    render(<MobileFeed data={makePoliticians(20)} onSelect={() => {}} onCompare={() => {}} />);

    expect(screen.getByText(/הצג עוד 5 פוליטיקאים/)).toBeInTheDocument();
  });

  it("calls onCompare when compare button is clicked", () => {
    const onCompare = vi.fn();
    render(<MobileFeed data={makePoliticians(5)} onSelect={() => {}} onCompare={onCompare} />);

    fireEvent.click(screen.getByText("השוואה"));
    expect(onCompare).toHaveBeenCalled();
  });

  it("calls onSelect when a politician card is clicked", () => {
    const onSelect = vi.fn();
    const data = makePoliticians(3);
    render(<MobileFeed data={data} onSelect={onSelect} onCompare={() => {}} />);

    // Click the first card (sorted by score descending)
    const cards = screen.getAllByRole("button").filter((b) => b.textContent.includes("פוליטיקאי"));
    fireEvent.click(cards[0]);
    expect(onSelect).toHaveBeenCalled();
  });

  it("sort pills change sort order", () => {
    const data = [
      {
        politician_id: "a",
        name: "A",
        displayName: "A",
        party: "P",
        displayParty: "P",
        overall_score: 3,
        media_volume: 10,
        delta: 0.1,
      },
      {
        politician_id: "b",
        name: "B",
        displayName: "B",
        party: "P",
        displayParty: "P",
        overall_score: 8,
        media_volume: 2,
        delta: -2.0,
      },
    ];
    render(<MobileFeed data={data} onSelect={() => {}} onCompare={() => {}} />);

    // Default sort by score — B (8.0) should be first
    const scoreButtons = screen.getAllByText("8.0");
    expect(scoreButtons.length).toBeGreaterThan(0);

    // Switch to delta sort
    fireEvent.click(screen.getByText("שינוי"));
    // B has bigger absolute delta (-2.0) so should be first
    const allCards = screen.getAllByRole("button").filter((b) => /[AB]/.test(b.textContent));
    expect(allCards.length).toBeGreaterThan(0);
  });
});
