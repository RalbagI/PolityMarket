// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PoliticianTrendChart from "./PoliticianTrendChart";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
}));

vi.mock("../store", () => ({
  default: (selector) => {
    const state = {
      summaryData: [
        { date: "2026-03-20", name: "Test Pol", overall_score: 5, media_volume: 3 },
        { date: "2026-03-21", name: "Test Pol", overall_score: 6, media_volume: 4 },
        { date: "2026-03-22", name: "Test Pol", overall_score: 7, media_volume: 5 },
      ],
      smaMode: "raw",
      setSmaMode: vi.fn(),
    };
    return selector(state);
  },
}));

// Mock Recharts to avoid SVG rendering issues in jsdom
vi.mock("recharts", () => ({
  ComposedChart: ({ children }) => <div data-testid="chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

vi.mock("date-fns", () => ({
  format: (d) => String(d),
  parseISO: (d) => d,
}));

describe("PoliticianTrendChart", () => {
  it("renders chart for a known politician", () => {
    render(<PoliticianTrendChart politicianName="Test Pol" />);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
    expect(screen.getByTestId("line")).toBeInTheDocument();
    expect(screen.getByTestId("bar")).toBeInTheDocument();
  });

  it("renders SMA toggle buttons", () => {
    render(<PoliticianTrendChart politicianName="Test Pol" />);
    expect(screen.getByText("trendlineChart.sma.raw")).toBeInTheDocument();
    expect(screen.getByText("trendlineChart.sma.7d")).toBeInTheDocument();
    expect(screen.getByText("trendlineChart.sma.14d")).toBeInTheDocument();
  });

  it("renders empty state for unknown politician", () => {
    render(<PoliticianTrendChart politicianName="Unknown Person" />);
    // No chart data → shows empty message
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });

  it("renders empty state when politicianName is null", () => {
    render(<PoliticianTrendChart politicianName={null} />);
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });
});
