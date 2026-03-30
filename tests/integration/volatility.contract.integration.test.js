import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { z } from "zod";
import useStore from "../../src/store";
import { server } from "./setup/msw-server";

const politicianVolatilitySchema = z.object({
  name: z.string().min(1),
  overall_score_stddev: z.number().nullable(),
  overall_score_mean: z.number().nullable(),
  overall_score_latest: z.number(),
  overall_score_sigma: z.number().nullable(),
  media_volume_stddev: z.number().nullable(),
  media_volume_mean: z.number().nullable(),
  media_volume_latest: z.number(),
  media_volume_sigma: z.number().nullable(),
  is_volatile: z.boolean(),
  direction: z.enum(["up", "down"]).nullable(),
});

const volatilityDataSchema = z.object({
  generated_at: z.string(),
  window: z.number().int().positive(),
  sigma_threshold: z.number().positive(),
  politicians: z.record(z.string(), politicianVolatilitySchema),
});

function resetVolatilitySlice() {
  useStore.setState({ volatilityData: null });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  resetVolatilitySlice();
});

describe("volatility data API contract", () => {
  it("loads volatility data via the store and validates schema", async () => {
    const fixture = {
      generated_at: "2026-03-30T02:00:00Z",
      window: 14,
      sigma_threshold: 2,
      politicians: {
        "benjamin-netanyahu": {
          name: "Benjamin Netanyahu",
          overall_score_stddev: 0.82,
          overall_score_mean: 5.3,
          overall_score_latest: 7.1,
          overall_score_sigma: 2.19,
          media_volume_stddev: 1.4,
          media_volume_mean: 4.2,
          media_volume_latest: 6.8,
          media_volume_sigma: 1.86,
          is_volatile: true,
          direction: "up",
        },
        "yair-lapid": {
          name: "Yair Lapid",
          overall_score_stddev: 0.5,
          overall_score_mean: 4.0,
          overall_score_latest: 4.2,
          overall_score_sigma: 0.4,
          media_volume_stddev: 0.3,
          media_volume_mean: 3.0,
          media_volume_latest: 3.1,
          media_volume_sigma: 0.33,
          is_volatile: false,
          direction: null,
        },
      },
    };

    server.use(
      http.get("*/data/volatility_data.json", () => {
        return HttpResponse.json(fixture);
      })
    );

    await useStore.getState().loadVolatility();
    const state = useStore.getState();

    expect(state.volatilityData).toBeTruthy();
    const parsed = volatilityDataSchema.safeParse(state.volatilityData);
    expect(parsed.success).toBe(true);
  });

  it("handles missing volatility data gracefully", async () => {
    server.use(
      http.get("*/data/volatility_data.json", () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    await useStore.getState().loadVolatility();
    expect(useStore.getState().volatilityData).toBeNull();
  });

  it("validates volatile politician has non-null sigma", async () => {
    const fixture = {
      generated_at: "2026-03-30T02:00:00Z",
      window: 14,
      sigma_threshold: 2,
      politicians: {
        "test-pol": {
          name: "Test Politician",
          overall_score_stddev: 1.0,
          overall_score_mean: 5.0,
          overall_score_latest: 8.0,
          overall_score_sigma: 3.0,
          media_volume_stddev: 0.5,
          media_volume_mean: 3.0,
          media_volume_latest: 3.5,
          media_volume_sigma: 1.0,
          is_volatile: true,
          direction: "up",
        },
      },
    };

    server.use(
      http.get("*/data/volatility_data.json", () => HttpResponse.json(fixture))
    );

    await useStore.getState().loadVolatility();
    const pol = useStore.getState().volatilityData.politicians["test-pol"];
    expect(pol.is_volatile).toBe(true);
    expect(pol.overall_score_sigma).not.toBeNull();
    expect(Math.abs(pol.overall_score_sigma)).toBeGreaterThanOrEqual(fixture.sigma_threshold);
  });
});
