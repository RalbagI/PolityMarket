import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { z } from "zod";
import useStore from "../../src/store";
import { server } from "./setup/msw-server";

const summaryEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  politician_id: z.string().min(1),
  name: z.string().min(1),
  party: z.string().min(1),
  overall_score: z.number(),
  media_volume: z.number(),
  market_score: z.number().nullable(),
  market_percentile: z.number().nullable(),
  market_tier: z.enum(["S", "A", "B", "C"]).nullable(),
  market_delta_points: z.number().nullable(),
  market_delta_pct: z.number().nullable(),
});

const summarySchema = z.array(summaryEntrySchema);

function resetSummarySlice() {
  useStore.setState({
    summaryData: [],
    loadError: null,
    _summaryFetchedAt: 0,
    _summaryFetching: false,
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  resetSummarySlice();
});

describe("summary API contract integration boilerplate", () => {
  it("loads summary via the store and validates API contract", async () => {
    const fixture = [
      {
        date: "2026-03-29",
        politician_id: "yoav-test",
        name: "יואב מבחן",
        party: "מפלגת בדיקה",
        overall_score: 7.8,
        media_volume: 120,
        market_score: 92.4,
        market_percentile: 96,
        market_tier: "S",
        market_delta_points: 4.8,
        market_delta_pct: 5.5,
      },
    ];

    server.use(
      http.get("*/data/timeseries_summary.compact.json", () => {
        return HttpResponse.json(fixture);
      })
    );

    await useStore.getState().loadSummary({ force: true });

    const state = useStore.getState();
    const parsed = summarySchema.safeParse(state.summaryData);

    expect(parsed.success).toBe(true);
    expect(state.loadError).toBeNull();
  });

  it("supports isolated per-test fixtures without leaking state", async () => {
    const isolatedFixture = [
      {
        date: "2026-03-30",
        politician_id: "dana-test",
        name: "דנה דוגמה",
        party: "מפלגת דוגמה",
        overall_score: 6.4,
        media_volume: 81,
        market_score: 68.1,
        market_percentile: 73,
        market_tier: "A",
        market_delta_points: null,
        market_delta_pct: null,
      },
    ];

    server.use(
      http.get("*/data/timeseries_summary.compact.json", () => {
        return HttpResponse.json(isolatedFixture);
      })
    );

    await useStore.getState().loadSummary({ force: true });

    const state = useStore.getState();
    expect(state.summaryData).toEqual(isolatedFixture);
  });
});
