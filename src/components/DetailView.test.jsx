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
        "detailView.section.trend": "מגמה לאורך זמן",
        "detailView.section.sources": "מקורות",
        "detailView.sources.news": "כותרות חדשות",
        "detailView.sources.social": "אזכורים ברשתות חברתיות",
        "detailView.sources.sourceLink": "קישור למקור",
        "detailView.sources.empty": "לא נמצאו מקורות זמינים עבור תאריך זה.",
        "detailView.rubrics.heading": "מדדים ממדיים",
        "detailView.rubrics.hostility": "עוינות",
        "detailView.rubrics.policyApproval": "אישור מדיניות",
        "detailView.rubrics.mediaAmplification": "הגברה תקשורתית",
        "detailView.dimension.publicSentiment": "סנטימנט ציבורי",
        "detailView.dimension.parliamentaryActivity": "פעילות פרלמנטרית",
        "detailView.dimension.mediaCredibility": "מהימנות תקשורתית",
        "detailView.dimension.transparencyEthics": "שקיפות ואתיקה",
        "detailView.dimension.fieldActivity": "פעילות שטח",
        "detailView.dimension.satireCulturalImpact": "השפעה תרבותית",
        "detailView.dimension.legislativeQuality": "איכות חקיקתית",
        "detailView.dimension.flipflopIndex": "עמידה בהבטחות",
        "detailView.dimension.noData": "אין נתונים",
        "detailView.dimension.showSentimentDetail": "פרט",
        "detailView.dimension.hideSentimentDetail": "סגור",
        "detailView.dimension.dataConfidence": `${options.count ?? "?"}/${options.total ?? "?"} ממדים`,
        "detailView.aiAnalysis.empty": "אין ניתוח זמין.",
        "detailView.scoreSmoothed": "הציון מבוסס על פעילות אחרונה ומגמה (מוחלק לאורך זמן)",
      };

      return dictionary[key] !== undefined ? dictionary[key] : key;
    },
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
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

describe("DetailView dimension section (merged Score Breakdown)", () => {
  it("renders 'פירוט ציון' section open by default with all 8 dimension labels", () => {
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
            dim_flipflop_index: 0.75,
          }),
        ]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );

    // Section is open by default — no click needed
    expect(screen.getByText("סנטימנט ציבורי")).toBeInTheDocument();
    expect(screen.getByText("פעילות פרלמנטרית")).toBeInTheDocument();
    expect(screen.getByText("מהימנות תקשורתית")).toBeInTheDocument();
    expect(screen.getByText("שקיפות ואתיקה")).toBeInTheDocument();
    expect(screen.getByText("פעילות שטח")).toBeInTheDocument();
    expect(screen.getByText("השפעה תרבותית")).toBeInTheDocument();
    expect(screen.getByText("איכות חקיקתית")).toBeInTheDocument();
    expect(screen.getByText("עמידה בהבטחות")).toBeInTheDocument();
  });

  it("shows data confidence badge with non-null count", () => {
    render(
      <DetailView
        todayDetail={[
          baseEntry({
            dim_public_sentiment: 0.72,
            dim_parliamentary_activity: 0.55,
            // 6 dims null
          }),
        ]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );

    expect(screen.getByText("2/8 ממדים")).toBeInTheDocument();
  });

  it("shows 'אין נתונים' placeholder for null dimension values", () => {
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

    const noDataLabels = screen.getAllByText("אין נתונים");
    expect(noDataLabels.length).toBeGreaterThanOrEqual(7);
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

    expect(screen.getByText("0.72")).toBeInTheDocument();
  });

  it("expands dim_public_sentiment to show 3 sub-metric bars", () => {
    render(
      <DetailView
        todayDetail={[
          baseEntry({
            dim_public_sentiment: 0.72,
            hostility_level: 0.3,
            policy_approval: 0.5,
            media_amplification: 0.7,
          }),
        ]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );

    // Sub-metrics not visible yet
    expect(screen.queryByText("עוינות")).not.toBeInTheDocument();

    // Click the expand button
    fireEvent.click(screen.getByRole("button", { name: "פרט" }));

    expect(screen.getByText("עוינות")).toBeInTheDocument();
    expect(screen.getByText("אישור מדיניות")).toBeInTheDocument();
    expect(screen.getByText("הגברה תקשורתית")).toBeInTheDocument();
  });

  it("renders market score header metadata", () => {
    render(
      <DetailView
        todayDetail={[
          baseEntry({
            market_score: 73,
            market_tier: "A",
            market_percentile: 88,
            market_delta_points: 4.2,
            market_delta_pct: 6.1,
          }),
        ]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );

    expect(screen.getAllByText("73").length).toBeGreaterThan(0);
    expect(screen.getByText("A-Tier")).toBeInTheDocument();
    expect(screen.getByText("P88")).toBeInTheDocument();
    expect(screen.getByText("Positive Trend")).toBeInTheDocument();
    expect(screen.getByText(/\+4\.2/)).toBeInTheDocument();
    expect(screen.getByText(/\(\+6\.1%\)/)).toBeInTheDocument();
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

    // Sources section is now defaultOpen=true, no click needed
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

    // Sources section is now defaultOpen=true, no click needed
    expect(screen.getByText("לא נמצאו מקורות זמינים עבור תאריך זה.")).toBeInTheDocument();
  });
});

describe("DetailView — score smoothing explanation", () => {
  it("shows smoothing explanation text below the score", () => {
    render(
      <DetailView
        todayDetail={[baseEntry()]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );
    expect(
      screen.getByText("הציון מבוסס על פעילות אחרונה ומגמה (מוחלק לאורך זמן)")
    ).toBeInTheDocument();
  });
});

describe("DetailView — alert toggle button", () => {
  it("renders alert toggle when onToggleAlert is provided", () => {
    render(
      <DetailView
        todayDetail={[baseEntry()]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
        onToggleAlert={() => {}}
        isAlertSubscribed={false}
      />
    );
    expect(screen.getByTestId("alert-toggle")).toBeInTheDocument();
  });

  it("calls onToggleAlert with politician_id on click", () => {
    const onToggleAlert = vi.fn();
    render(
      <DetailView
        todayDetail={[baseEntry()]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
        onToggleAlert={onToggleAlert}
        isAlertSubscribed={false}
      />
    );
    fireEvent.click(screen.getByTestId("alert-toggle"));
    expect(onToggleAlert).toHaveBeenCalledWith("benjamin-netanyahu");
  });

  it("does not render alert toggle when onToggleAlert is not provided", () => {
    render(
      <DetailView
        todayDetail={[baseEntry()]}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-24"
        loading={false}
      />
    );
    expect(screen.queryByTestId("alert-toggle")).not.toBeInTheDocument();
  });
});
