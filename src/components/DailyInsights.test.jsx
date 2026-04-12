// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DailyInsights from "./DailyInsights";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
  localizeParty: (_t, party) => party,
}));

const makeSummaryData = () => [
  // Previous day
  {
    politician_id: "alice",
    name: "Alice",
    party: "PartyA",
    date: "2026-04-04",
    market_score: 50,
    media_volume: 3,
  },
  {
    politician_id: "bob",
    name: "Bob",
    party: "PartyB",
    date: "2026-04-04",
    market_score: 60,
    media_volume: 5,
  },
  {
    politician_id: "carol",
    name: "Carol",
    party: "PartyC",
    date: "2026-04-04",
    market_score: 40,
    media_volume: 2,
  },
  {
    politician_id: "dave",
    name: "Dave",
    party: "PartyD",
    date: "2026-04-04",
    market_score: 70,
    media_volume: 8,
  },
  // Latest day
  {
    politician_id: "alice",
    name: "Alice",
    party: "PartyA",
    date: "2026-04-05",
    market_score: 65,
    media_volume: 4,
  },
  {
    politician_id: "bob",
    name: "Bob",
    party: "PartyB",
    date: "2026-04-05",
    market_score: 45,
    media_volume: 6,
  },
  {
    politician_id: "carol",
    name: "Carol",
    party: "PartyC",
    date: "2026-04-05",
    market_score: 42,
    media_volume: 1,
  },
  {
    politician_id: "dave",
    name: "Dave",
    party: "PartyD",
    date: "2026-04-05",
    market_score: 68,
    media_volume: 9,
  },
];

const makeData = () => [
  {
    politician_id: "alice",
    name: "Alice",
    party: "PartyA",
    displayName: "Alice",
    market_score: 65,
    media_volume: 4,
  },
  {
    politician_id: "bob",
    name: "Bob",
    party: "PartyB",
    displayName: "Bob",
    market_score: 45,
    media_volume: 6,
  },
  {
    politician_id: "carol",
    name: "Carol",
    party: "PartyC",
    displayName: "Carol",
    market_score: 42,
    media_volume: 1,
  },
  {
    politician_id: "dave",
    name: "Dave",
    party: "PartyD",
    displayName: "Dave",
    market_score: 68,
    media_volume: 9,
  },
];

describe("DailyInsights", () => {
  it("renders 3 insight cards", () => {
    render(<DailyInsights data={makeData()} summaryData={makeSummaryData()} onSelect={() => {}} />);
    // Biggest riser: Alice (+15), Biggest faller: Bob (-15), Most covered: Dave (9)
    // Desktop grid renders 3 cards
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("renders correct category labels", () => {
    render(<DailyInsights data={makeData()} summaryData={makeSummaryData()} onSelect={() => {}} />);
    expect(screen.getAllByText("dailyInsights.fastestRise").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("dailyInsights.fastestDrop").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("dailyInsights.mostWatched").length).toBeGreaterThanOrEqual(1);
  });

  it("renders correct politician names", () => {
    render(<DailyInsights data={makeData()} summaryData={makeSummaryData()} onSelect={() => {}} />);
    // Alice is biggest riser (+15), Bob is biggest faller (-15), Dave is most covered (vol 9)
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Dave").length).toBeGreaterThanOrEqual(1);
  });

  it("prefers interest_score over raw media volume for the Most Watched card", () => {
    const summaryData = [
      {
        politician_id: "alice",
        name: "Alice",
        party: "PartyA",
        date: "2026-04-04",
        market_score: 50,
      },
      { politician_id: "bob", name: "Bob", party: "PartyB", date: "2026-04-04", market_score: 60 },
      {
        politician_id: "carol",
        name: "Carol",
        party: "PartyC",
        date: "2026-04-04",
        market_score: 40,
      },
      {
        politician_id: "alice",
        name: "Alice",
        party: "PartyA",
        date: "2026-04-05",
        market_score: 55,
      },
      { politician_id: "bob", name: "Bob", party: "PartyB", date: "2026-04-05", market_score: 45 },
      {
        politician_id: "carol",
        name: "Carol",
        party: "PartyC",
        date: "2026-04-05",
        market_score: 42,
      },
    ];
    const data = [
      {
        politician_id: "alice",
        name: "Alice",
        party: "PartyA",
        displayName: "Alice",
        market_score: 55,
        media_volume: 4,
        interest_score: 9,
      },
      {
        politician_id: "bob",
        name: "Bob",
        party: "PartyB",
        displayName: "Bob",
        market_score: 45,
        media_volume: 20,
        interest_score: 0,
      },
      {
        politician_id: "carol",
        name: "Carol",
        party: "PartyC",
        displayName: "Carol",
        market_score: 42,
        media_volume: 3,
        interest_score: 1,
      },
    ];

    render(<DailyInsights data={data} summaryData={summaryData} onSelect={() => {}} />);

    const desktopButtons = document.querySelector(".md\\:flex")?.querySelectorAll("button") ?? [];
    expect(desktopButtons[0]?.textContent).toContain("dailyInsights.mostWatched");
    expect(desktopButtons[0]?.textContent).toContain("Alice");
  });

  it("keeps category labels aligned when a category has no candidate", () => {
    const summaryData = [
      {
        politician_id: "alice",
        name: "Alice",
        party: "PartyA",
        date: "2026-04-04",
        market_score: 60,
        media_volume: 2,
      },
      {
        politician_id: "bob",
        name: "Bob",
        party: "PartyB",
        date: "2026-04-04",
        market_score: 50,
        media_volume: 4,
      },
      {
        politician_id: "alice",
        name: "Alice",
        party: "PartyA",
        date: "2026-04-05",
        market_score: 60,
        media_volume: 3,
      },
      {
        politician_id: "bob",
        name: "Bob",
        party: "PartyB",
        date: "2026-04-05",
        market_score: 40,
        media_volume: 5,
      },
      {
        politician_id: "carol",
        name: "Carol",
        party: "PartyC",
        date: "2026-04-05",
        market_score: 52,
        media_volume: 7,
      },
    ];
    const data = [
      {
        politician_id: "alice",
        name: "Alice",
        party: "PartyA",
        displayName: "Alice",
        market_score: 60,
        media_volume: 3,
      },
      {
        politician_id: "bob",
        name: "Bob",
        party: "PartyB",
        displayName: "Bob",
        market_score: 40,
        media_volume: 5,
      },
      {
        politician_id: "carol",
        name: "Carol",
        party: "PartyC",
        displayName: "Carol",
        market_score: 52,
        media_volume: 7,
      },
    ];

    render(<DailyInsights data={data} summaryData={summaryData} onSelect={() => {}} />);

    expect(screen.queryByText("dailyInsights.fastestRise")).not.toBeInTheDocument();
    expect(screen.getAllByText("dailyInsights.fastestDrop").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("dailyInsights.mostWatched").length).toBeGreaterThanOrEqual(1);
  });

  it("selects most covered from today's rows even without previous-day data", () => {
    const summaryData = [
      {
        politician_id: "alice",
        name: "Alice",
        party: "PartyA",
        date: "2026-04-04",
        market_score: 50,
        media_volume: 3,
      },
      {
        politician_id: "bob",
        name: "Bob",
        party: "PartyB",
        date: "2026-04-04",
        market_score: 60,
        media_volume: 5,
      },
      {
        politician_id: "alice",
        name: "Alice",
        party: "PartyA",
        date: "2026-04-05",
        market_score: 65,
        media_volume: 4,
      },
      {
        politician_id: "bob",
        name: "Bob",
        party: "PartyB",
        date: "2026-04-05",
        market_score: 45,
        media_volume: 6,
      },
      {
        politician_id: "eve",
        name: "Eve",
        party: "PartyE",
        date: "2026-04-05",
        market_score: 55,
        media_volume: 12,
      },
    ];
    const data = [
      {
        politician_id: "alice",
        name: "Alice",
        party: "PartyA",
        displayName: "Alice",
        market_score: 65,
        media_volume: 4,
      },
      {
        politician_id: "bob",
        name: "Bob",
        party: "PartyB",
        displayName: "Bob",
        market_score: 45,
        media_volume: 6,
      },
      {
        politician_id: "eve",
        name: "Eve",
        party: "PartyE",
        displayName: "Eve",
        market_score: 55,
        media_volume: 12,
      },
    ];

    render(<DailyInsights data={data} summaryData={summaryData} onSelect={() => {}} />);

    expect(screen.getAllByText("Eve").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("dailyInsights.mostWatched").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onSelect when insight card is clicked", () => {
    const onSelect = vi.fn();
    render(<DailyInsights data={makeData()} summaryData={makeSummaryData()} onSelect={onSelect} />);
    // Click the first "Alice" button (biggest riser)
    const aliceButtons = screen.getAllByText("Alice");
    fireEvent.click(aliceButtons[0].closest("button"));
    expect(onSelect).toHaveBeenCalledWith("Alice");
  });

  it("deduplicates — no politician appears in two cards", () => {
    // Alice is both biggest riser AND has decent volume, but should only appear once
    render(<DailyInsights data={makeData()} summaryData={makeSummaryData()} onSelect={() => {}} />);
    // Desktop compact rows use md:flex layout with text-sm names
    const desktopRow = document.querySelector(".md\\:flex");
    expect(desktopRow).toBeTruthy();
    const buttons = desktopRow.querySelectorAll("button");
    const names = [...buttons].map((btn) => btn.querySelector(".text-sm")?.textContent);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("renders empty state when no data", () => {
    render(<DailyInsights data={[]} summaryData={[]} onSelect={() => {}} />);
    expect(screen.getByText("dailyInsights.noData")).toBeInTheDocument();
  });

  it("renders empty state when only one date available", () => {
    const singleDay = makeSummaryData().filter((d) => d.date === "2026-04-05");
    render(<DailyInsights data={makeData()} summaryData={singleDay} onSelect={() => {}} />);
    expect(screen.getByText("dailyInsights.noData")).toBeInTheDocument();
  });

  it("renders sparklines inside cards", () => {
    const { container } = render(
      <DailyInsights data={makeData()} summaryData={makeSummaryData()} onSelect={() => {}} />
    );
    const svgs = container.querySelectorAll("svg");
    // At least 3 sparklines (desktop) + 3 (mobile) = 6
    expect(svgs.length).toBeGreaterThanOrEqual(3);
  });

  it("renders tap to explore hint", () => {
    render(<DailyInsights data={makeData()} summaryData={makeSummaryData()} onSelect={() => {}} />);
    expect(screen.getAllByText("dailyInsights.tapToExplore").length).toBeGreaterThanOrEqual(1);
  });

  it("works in party mode", () => {
    const partySummary = [
      { party: "Likud", date: "2026-04-04", market_score: 60, media_volume: 5 },
      { party: "Labor", date: "2026-04-04", market_score: 50, media_volume: 3 },
      { party: "Meretz", date: "2026-04-04", market_score: 45, media_volume: 4 },
      { party: "Likud", date: "2026-04-05", market_score: 70, media_volume: 7 },
      { party: "Labor", date: "2026-04-05", market_score: 40, media_volume: 2 },
      { party: "Meretz", date: "2026-04-05", market_score: 48, media_volume: 6 },
    ];
    const partyData = [
      {
        party: "Likud",
        name: "Likud",
        politician_id: "party:Likud",
        market_score: 70,
        media_volume: 7,
      },
      {
        party: "Labor",
        name: "Labor",
        politician_id: "party:Labor",
        market_score: 40,
        media_volume: 2,
      },
      {
        party: "Meretz",
        name: "Meretz",
        politician_id: "party:Meretz",
        market_score: 48,
        media_volume: 6,
      },
    ];
    const onSelect = vi.fn();
    render(
      <DailyInsights
        data={partyData}
        summaryData={partySummary}
        signalMode="media_climate"
        onSelect={onSelect}
        entityMode="party"
      />
    );
    // Likud is biggest riser (+10), Labor is biggest faller (-10)
    expect(screen.getAllByText("Likud").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Labor").length).toBeGreaterThanOrEqual(1);
  });

  it("has correct aria-label on the container", () => {
    render(<DailyInsights data={makeData()} summaryData={makeSummaryData()} onSelect={() => {}} />);
    expect(screen.getByRole("region")).toHaveAttribute("aria-label", "dailyInsights.ariaLabel");
  });

  it("renders mobile scroll container with snap and overflow classes", () => {
    const { container } = render(
      <DailyInsights data={makeData()} summaryData={makeSummaryData()} onSelect={() => {}} />
    );
    const mobileScroll = container.querySelector(".md\\:hidden.overflow-x-auto");
    expect(mobileScroll).toBeTruthy();
    expect(mobileScroll.className).toContain("snap-x");
    expect(mobileScroll.className).toContain("snap-mandatory");
  });
});
