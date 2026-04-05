import { describe, it, expect, vi } from "vitest";
import getSparklineData from "./getSparklineData";

vi.mock("./signalMode", () => ({
  resolveSignalDisplayScore: (entry, _mode) => entry.market_score ?? null,
}));

const makeSummary = () => [
  { politician_id: "alice", name: "Alice", date: "2026-04-01", market_score: 50 },
  { politician_id: "alice", name: "Alice", date: "2026-04-02", market_score: 55 },
  { politician_id: "alice", name: "Alice", date: "2026-04-03", market_score: 60 },
  { politician_id: "alice", name: "Alice", date: "2026-04-04", market_score: 58 },
  { politician_id: "alice", name: "Alice", date: "2026-04-05", market_score: 62 },
  { politician_id: "bob", name: "Bob", date: "2026-04-01", market_score: 40 },
  { politician_id: "bob", name: "Bob", date: "2026-04-02", market_score: 42 },
  { politician_id: "bob", name: "Bob", date: "2026-04-03", market_score: 38 },
];

describe("getSparklineData", () => {
  it("returns last N days of scores for a politician_id", () => {
    const result = getSparklineData(makeSummary(), "alice", "media_climate", 3);
    expect(result).toEqual([60, 58, 62]);
  });

  it("returns all available data when days exceeds entries", () => {
    const result = getSparklineData(makeSummary(), "bob", "media_climate", 10);
    expect(result).toEqual([40, 42, 38]);
  });

  it("defaults to 7 days", () => {
    const result = getSparklineData(makeSummary(), "alice", "media_climate");
    expect(result).toEqual([50, 55, 60, 58, 62]);
  });

  it("returns empty array for unknown entity", () => {
    const result = getSparklineData(makeSummary(), "unknown", "media_climate");
    expect(result).toEqual([]);
  });

  it("returns empty array for empty summaryData", () => {
    expect(getSparklineData([], "alice", "media_climate")).toEqual([]);
  });

  it("returns empty array for null/undefined inputs", () => {
    expect(getSparklineData(null, "alice", "media_climate")).toEqual([]);
    expect(getSparklineData(undefined, "alice", "media_climate")).toEqual([]);
    expect(getSparklineData(makeSummary(), "", "media_climate")).toEqual([]);
    expect(getSparklineData(makeSummary(), null, "media_climate")).toEqual([]);
  });

  it("filters out entries with non-finite scores", () => {
    const data = [
      { politician_id: "x", date: "2026-04-01", market_score: 50 },
      { politician_id: "x", date: "2026-04-02", market_score: null },
      { politician_id: "x", date: "2026-04-03", market_score: 60 },
    ];
    const result = getSparklineData(data, "x", "media_climate");
    expect(result).toEqual([50, 60]);
  });

  it("matches by party name for party mode", () => {
    const data = [
      { party: "Likud", date: "2026-04-01", market_score: 70 },
      { party: "Likud", date: "2026-04-02", market_score: 72 },
      { party: "Labor", date: "2026-04-01", market_score: 45 },
    ];
    const result = getSparklineData(data, "Likud", "media_climate");
    expect(result).toEqual([70, 72]);
  });

  it("sorts by date ascending before slicing", () => {
    const data = [
      { politician_id: "a", date: "2026-04-03", market_score: 30 },
      { politician_id: "a", date: "2026-04-01", market_score: 10 },
      { politician_id: "a", date: "2026-04-02", market_score: 20 },
    ];
    const result = getSparklineData(data, "a", "media_climate", 2);
    expect(result).toEqual([20, 30]);
  });
});
