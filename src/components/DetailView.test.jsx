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
        "detailView.section.dimensions": "8 ממדים",
        "detailView.section.sources": "מקורות",
        "detailView.sources.news": "כותרות חדשות",
        "detailView.sources.social": "אזכורים ברשתות חברתיות",
        "detailView.sources.sourceLink": "קישור למקור",
        "detailView.sources.empty": "לא נמצאו מקורות זמינים עבור תאריך זה.",
        "detailView.rubrics.heading": "מדדים ממדיים",
        "detailView.breakdown.policy": "מדיניות 40%",
        "detailView.breakdown.hostility": "עוינות 35%",
        "detailView.breakdown.volume": "נפח 25%",
        "detailView.dimension.publicSentiment": "סנטימנט ציבורי",
        "detailView.dimension.parliamentaryActivity": "פעילות פרלמנטרית",
        "detailView.dimension.mediaCredibility": "מהימנות תקשורתית",
        "detailView.dimension.transparencyEthics": "שקיפות ואתיקה",
        "detailView.dimension.fieldActivity": "פעילות שטח",
        "detailView.dimension.satireCulturalImpact": "השפעה תרבותית",
        "detailView.dimension.legislativeQuality": "איכות חקיקתית",
        "detailView.dimension.flipflopIndex": "עמידה בהבטחות",
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

describe("DetailView 8-dimension section", () => {
  it("renders '8 ממדים' accordion button", () => {
    render(
      <DetailView
        todayDetail={[baseEntry({ dim_public_sentiment: 0.72, dim_parliamentary_activity: 0.55 })]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );
    expect(screen.getByRole("button", { name: "8 ממדים" })).toBeInTheDocument();
  });

  it("shows dimension labels and values when expanded", () => {
    render(
      <DetailView
        todayDetail={[
          baseEntry({
            dim_public_sentiment: 0.72,
            dim_parliamentary_activity: 0.55,
            dim_media_credibility: 0.8,
            dim_transparency_ethics: 0.9,
            dim_field_activity: 0.33,
            dim_satire_cultural_impact: 0.4,
            dim_legislative_quality: 0.6,
            dim_flipflop_index: 0.0,
          }),
        ]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "8 ממדים" }));

    expect(screen.getByText("סנטימנט ציבורי")).toBeInTheDocument();
    expect(screen.getByText("פעילות פרלמנטרית")).toBeInTheDocument();
    expect(screen.getByText("מהימנות תקשורתית")).toBeInTheDocument();
    expect(screen.getByText("שקיפות ואתיקה")).toBeInTheDocument();
    expect(screen.getByText("פעילות שטח")).toBeInTheDocument();
    expect(screen.getByText("השפעה תרבותית")).toBeInTheDocument();
    expect(screen.getByText("איכות חקיקתית")).toBeInTheDocument();
    expect(screen.getByText("עמידה בהבטחות")).toBeInTheDocument();
  });

  it("renders '—' placeholder for null dimension values", () => {
    render(
      <DetailView
        todayDetail={[
          baseEntry({
            dim_public_sentiment: 0.72,
            dim_parliamentary_activity: null,
            dim_media_credibility: null,
            dim_transparency_ethics: null,
            dim_field_activity: null,
            dim_satire_cultural_impact: null,
            dim_legislative_quality: null,
            dim_flipflop_index: null,
          }),
        ]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "8 ממדים" }));

    // Null values render as '—'
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(7);
  });

  it("shows numeric value formatted to 2 decimal places for non-null dims", () => {
    render(
      <DetailView
        todayDetail={[baseEntry({ dim_public_sentiment: 0.725 })]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "8 ממדים" }));
    expect(screen.getByText("0.72")).toBeInTheDocument();
  });
});

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
