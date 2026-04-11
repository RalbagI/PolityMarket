// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DailyInsights from "./DailyInsights";

const storeState = {
  bottomLines: {
    date: "2026-04-11",
    bottom_lines: [
      {
        politician_id: "alice",
        bottom_line_he: "אליס בולטת השבוע עם מהלך מפתיע",
        bottom_line_en: "Alice breaks out this week with a surprising move",
      },
    ],
  },
};

vi.mock("../store", () => ({
  default: (selector) => selector(storeState),
}));

const i18nState = { language: "he" };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      get language() {
        return i18nState.language;
      },
      dir: () => (i18nState.language === "en" ? "ltr" : "rtl"),
      changeLanguage: () => {},
    },
  }),
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
  localizeParty: (_t, party) => party,
}));

function makeSummary() {
  return [
    {
      politician_id: "alice",
      name: "Alice",
      party: "A",
      date: "2026-04-04",
      market_score: 50,
      media_volume: 10,
    },
    {
      politician_id: "alice",
      name: "Alice",
      party: "A",
      date: "2026-04-05",
      market_score: 80,
      media_volume: 10,
      market_delta_points: 30,
    },
  ];
}

describe("DailyInsights bottom-line locale gating", () => {
  beforeEach(() => {
    i18nState.language = "he";
  });

  it("renders the Hebrew sentence when UI language is Hebrew", () => {
    render(
      <DailyInsights
        data={makeSummary().slice(1)}
        summaryData={makeSummary()}
        onSelect={() => {}}
      />
    );
    expect(screen.getAllByText("אליס בולטת השבוע עם מהלך מפתיע").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Alice breaks out this week with a surprising move")).toBeNull();
  });

  it("renders only the English sentence when UI language is English (regression for #163)", () => {
    i18nState.language = "en";
    render(
      <DailyInsights
        data={makeSummary().slice(1)}
        summaryData={makeSummary()}
        onSelect={() => {}}
      />
    );
    expect(
      screen.getAllByText("Alice breaks out this week with a surprising move").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("אליס בולטת השבוע עם מהלך מפתיע")).toBeNull();
  });
});
