import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { z } from "zod";
import useStore from "../../src/store";
import { server } from "./setup/msw-server";

const partySummaryEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  party: z.string().min(1),
  wing: z.string().nullable().optional(),
  member_count: z.number().optional(),
  overall_score: z.number(),
  media_volume: z.number(),
});

const partySummarySchema = z.array(partySummaryEntrySchema);

function resetPartySummarySlice() {
  useStore.setState({ partySummaryData: [] });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  resetPartySummarySlice();
});

describe("party summary API contract integration boilerplate", () => {
  it("loads party summary and validates contract", async () => {
    const fixture = [
      {
        date: "2026-03-29",
        party: "מפלגת בדיקה",
        wing: "center",
        member_count: 12,
        overall_score: 6.7,
        media_volume: 315,
      },
    ];

    server.use(
      http.get("*/data/party_summary.json", () => {
        return HttpResponse.json(fixture);
      })
    );

    await useStore.getState().loadPartySummary();

    const state = useStore.getState();
    const parsed = partySummarySchema.safeParse(state.partySummaryData);

    expect(parsed.success).toBe(true);
    expect(state.partySummaryData).toEqual(fixture);
  });
});
