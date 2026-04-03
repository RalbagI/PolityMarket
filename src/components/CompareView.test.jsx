// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompareView from "./CompareView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => {
      const dict = {
        "compare.pickA": "בחר פוליטיקאי",
        "compare.pickB": "בחר פוליטיקאי",
        "compare.dimensions": "השוואת ממדים",
        "filterBar.search.placeholder": "חיפוש...",
        "detailView.dimension.publicSentiment": "סנטימנט ציבורי",
        "detailView.dimension.parliamentaryActivity": "פעילות פרלמנטרית",
        "detailView.dimension.mediaCredibility": "מהימנות תקשורתית",
        "detailView.dimension.transparencyEthics": "שקיפות ואתיקה",
        "detailView.dimension.fieldActivity": "פעילות שטח",
        "detailView.dimension.satireCulturalImpact": "השפעה תרבותית",
        "detailView.dimension.legislativeQuality": "איכות חקיקתית",
        "detailView.dimension.flipflopIndex": "עמידה בהבטחות",
        "trendlineChart.sma.raw": "גולמי",
        "trendlineChart.sma.7d": "7d",
        "trendlineChart.sma.14d": "14d",
        "detailView.sources.empty": "אין",
        "trendlineChart.axis.score": "ציון",
        "trendlineChart.axis.volume": "נפח",
      };
      return dict[key] ?? options.defaultValue ?? key;
    },
  }),
}));

vi.mock("./Avatar", () => ({
  default: () => <div data-testid="avatar" />,
}));

vi.mock("./PoliticianTrendChart", () => ({
  default: () => <div data-testid="trend-chart" />,
}));

const mockStoreState = {
  summaryData: [],
  smaMode: "raw",
  setSmaMode: vi.fn(),
};

vi.mock("../store", () => ({
  default: (selector) => selector(mockStoreState),
}));

function makeData() {
  return [
    {
      politician_id: "alice",
      name: "Alice",
      party: "PartyA",
      overall_score: 7.5,
      dim_public_sentiment: 0.8,
      dim_parliamentary_activity: 0.6,
      dim_media_credibility: 0.7,
      dim_transparency_ethics: 0.5,
      dim_field_activity: null,
      dim_satire_cultural_impact: null,
      dim_legislative_quality: null,
      dim_flipflop_index: null,
    },
    {
      politician_id: "bob",
      name: "Bob",
      party: "PartyB",
      overall_score: 4.2,
      dim_public_sentiment: 0.3,
      dim_parliamentary_activity: 0.4,
      dim_media_credibility: 0.5,
      dim_transparency_ethics: 0.6,
      dim_field_activity: 0.2,
      dim_satire_cultural_impact: null,
      dim_legislative_quality: null,
      dim_flipflop_index: null,
    },
  ];
}

describe("CompareView", () => {
  it("renders two politician pickers initially", () => {
    render(<CompareView todayData={makeData()} />);

    const pickLabels = screen.getAllByText("בחר פוליטיקאי");
    expect(pickLabels.length).toBe(2);
  });

  it("shows comparison after selecting two politicians", () => {
    render(<CompareView todayData={makeData()} />);

    // Both pickers start in open state (no selection yet)
    const inputs = screen.getAllByPlaceholderText("חיפוש...");
    expect(inputs.length).toBe(2);

    // Select first politician in picker A (click Alice row — score 7.5)
    const aliceButtons = screen.getAllByText("7.5");
    fireEvent.click(aliceButtons[0]);

    // Select Bob in picker B (click Bob row — score 4.2)
    const bobButtons = screen.getAllByText("4.2");
    fireEvent.click(bobButtons[0]);

    // Should show overall scores and dimension comparison
    expect(screen.getByText("vs")).toBeInTheDocument();
    expect(screen.getByText("השוואת ממדים")).toBeInTheDocument();
  });
});
