// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DetailView from "./DetailView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => {
      if (Object.prototype.hasOwnProperty.call(options, "defaultValue")) {
        return options.defaultValue;
      }

      const dictionary = {
        "detailView.like": "לייק",
        "detailView.unlike": "בטל לייק",
        "detailView.section.aiAnalysis": "ניתוח AI",
        "detailView.section.scoreBreakdown": "פירוט ציון",
        "detailView.section.sources": "מקורות",
        "detailView.sources.news": "כותרות חדשות",
        "detailView.sources.social": "אזכורים ברשתות חברתיות",
        "detailView.sources.sourceLink": "קישור למקור",
        "detailView.sources.empty": "לא נמצאו מקורות זמינים עבור תאריך זה.",
        "detailView.rubrics.heading": "מדדים ממדיים",
        "detailView.breakdown.policy": "מדיניות 40%",
        "detailView.breakdown.hostility": "עוינות 35%",
        "detailView.breakdown.volume": "נפח 25%",
      };

      return dictionary[key] || key;
    },
  }),
}));

vi.mock("./Avatar", () => ({
  default: () => <div data-testid="avatar" />,
}));

vi.mock("./PoliticianTrendChart", () => ({
  default: () => <div data-testid="trend-chart" />,
}));

function baseEntry(overrides = {}) {
  return {
    politician_id: "benjamin-netanyahu",
    name: "Benjamin Netanyahu",
    party: "Likud",
    hostility_level: 0.5,
    policy_approval: 0.2,
    media_amplification: 0.6,
    news_sentiment: 6,
    social_sentiment: 5,
    media_volume: 6,
    overall_score: 5.6,
    chain_of_thought: "analysis",
    ...overrides,
  };
}

describe("DetailView sources section", () => {
  it("renders news + social sources with external link when available", () => {
    const detail = [
      baseEntry({
        news_headlines: ["Headline A"],
        social_mentions: [
          {
            text: "Mention A",
            thread_context: ["SOURCE: https://example.com/thread/1"],
            speaker_metadata: { handle: "@author", known_satirist: false },
          },
        ],
      }),
    ];

    render(
      <DetailView
        todayDetail={detail}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-19"
        loading={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "מקורות" }));

    expect(screen.getByText("כותרות חדשות")).toBeInTheDocument();
    expect(screen.getByText(/Headline A/)).toBeInTheDocument();
    expect(screen.getByText("אזכורים ברשתות חברתיות")).toBeInTheDocument();
    expect(screen.getByText(/Mention A/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "קישור למקור" })).toHaveAttribute(
      "href",
      "https://example.com/thread/1"
    );
  });

  it("renders empty state when no source fields exist", () => {
    render(
      <DetailView
        todayDetail={[baseEntry()]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-19"
        loading={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "מקורות" }));

    expect(screen.getByText("לא נמצאו מקורות זמינים עבור תאריך זה.")).toBeInTheDocument();
  });
});
