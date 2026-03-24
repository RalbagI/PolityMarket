import { describe, it, expect, beforeEach } from "vitest";
import { fetchParliamentaryData, clearCache } from "./lib/openKnesset.js";

const BASE_CONFIG = {
  baseUrl: "https://oknesset.test/api/v2/",
  timeoutMs: 5000,
  windowDays: 7,
  memberIdMap: { "test-politician": 42 },
};

function makeFetchJson(responses) {
  return async (url) => {
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        if (response instanceof Error) throw response;
        return response;
      }
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
}

beforeEach(() => {
  clearCache();
});

describe("fetchParliamentaryData", () => {
  it("returns null when politician has no memberIdMap entry", async () => {
    const result = await fetchParliamentaryData("unknown-politician", BASE_CONFIG);
    expect(result).toBeNull();
  });

  it("returns null when memberIdMap is empty", async () => {
    const config = { ...BASE_CONFIG, memberIdMap: {} };
    const result = await fetchParliamentaryData("test-politician", config);
    expect(result).toBeNull();
  });

  it("returns structured data on success path", async () => {
    const mockFetch = makeFetchJson({
      "vote/": {
        objects: [
          { title: "Budget Bill", vote: "for", time: "2026-03-17" },
          { title: "Housing Amendment", vote: "against", time: "2026-03-18" },
          { title: "Welfare Cut", vote: "no-show", time: "2026-03-19" },
        ],
      },
      "member/42/": {
        committee_positions: [{ name: "Constitution Committee" }, { name: "Finance Committee" }],
      },
      "mmm/": { objects: [{ id: 1 }, { id: 2 }] },
    });

    const result = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);

    expect(result).not.toBeNull();
    expect(result.attendance_rate).toBeCloseTo(2 / 3, 5); // 2 out of 3 attended
    expect(result.committee_rate).toBe(0.85); // ≥2 roles
    expect(result.mmm_requests_count).toBe(2);
    expect(result.voting_record).toHaveLength(3);
    expect(result.voting_record[0]).toMatchObject({ title: "Budget Bill", vote: "for" });
  });

  it("returns null attendance_rate when votes array is empty", async () => {
    const mockFetch = makeFetchJson({
      "vote/": { objects: [] },
      "member/42/": { committee_positions: [] },
      "mmm/": { objects: [] },
    });

    const result = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);
    expect(result.attendance_rate).toBeNull();
    expect(result.committee_rate).toBe(0.3); // 0 roles
    expect(result.mmm_requests_count).toBe(0);
  });

  it("returns partial data (null attendance) when vote endpoint fails with 404", async () => {
    const err = new Error("HTTP 404");
    err.status = 404;
    const mockFetch = makeFetchJson({
      "vote/": err,
      "member/42/": { committee_positions: [] },
      "mmm/": { objects: [] },
    });

    const result = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);
    // allSettled absorbs the error — partial data with null attendance
    expect(result).not.toBeNull();
    expect(result.attendance_rate).toBeNull();
    expect(result.mmm_requests_count).toBe(0);
  });

  it("returns partial data with all nulls when all endpoints fail", async () => {
    const mockFetch = async () => {
      throw new Error("Network error");
    };

    const result = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);
    // Promise.allSettled absorbs all errors — returns partial struct, not null
    expect(result).not.toBeNull();
    expect(result.attendance_rate).toBeNull();
    expect(result.committee_rate).toBeNull();
    expect(result.mmm_requests_count).toBe(0);
  });

  it("caches result and returns same object on second call", async () => {
    let callCount = 0;
    const mockFetch = async (url) => {
      callCount++;
      if (url.includes("vote/")) return { objects: [] };
      if (url.includes("member/")) return { committee_positions: [] };
      if (url.includes("mmm/")) return { objects: [] };
      throw new Error("unexpected");
    };

    const r1 = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);
    const r2 = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);

    expect(r1).toBe(r2); // same reference — cache hit
    // Call count: 3 endpoints on first call only
    expect(callCount).toBe(3);
  });

  it("normalizes Hebrew vote directions", async () => {
    const mockFetch = makeFetchJson({
      "vote/": {
        objects: [
          { title: "תקציב", vote: "בעד", time: "2026-03-17" },
          { title: "תיקון", vote: "נגד", time: "2026-03-18" },
        ],
      },
      "member/42/": { committee_positions: [] },
      "mmm/": { objects: [] },
    });

    const result = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);
    expect(result.voting_record[0].vote).toBe("for");
    expect(result.voting_record[1].vote).toBe("against");
  });

  it("truncates voting_record to 10 entries", async () => {
    const votes = Array.from({ length: 20 }, (_, i) => ({
      title: `Vote ${i}`,
      vote: "for",
      time: "2026-03-17",
    }));
    const mockFetch = makeFetchJson({
      "vote/": { objects: votes },
      "member/42/": { committee_positions: [] },
      "mmm/": { objects: [] },
    });

    const result = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);
    expect(result.voting_record).toHaveLength(10);
  });

  it("committee_rate is 0.30 for member with no positions", async () => {
    const mockFetch = makeFetchJson({
      "vote/": { objects: [] },
      "member/42/": { committee_positions: [] },
      "mmm/": { objects: [] },
    });
    const result = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);
    expect(result.committee_rate).toBe(0.3);
  });

  it("committee_rate is 0.70 for member with 1 position", async () => {
    const mockFetch = makeFetchJson({
      "vote/": { objects: [] },
      "member/42/": { committee_positions: [{ name: "Finance" }] },
      "mmm/": { objects: [] },
    });
    const result = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);
    expect(result.committee_rate).toBe(0.7);
  });

  it("initiative_score is always null (bills API not yet implemented)", async () => {
    // Explicit assertion so regressions are caught when the bills API is wired in
    const mockFetch = makeFetchJson({
      "vote/": { objects: [{ title: "Test Bill", vote: "for", time: "2026-03-17" }] },
      "member/42/": { committee_positions: [] },
      "mmm/": { objects: [] },
    });
    const result = await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);
    expect(result.initiative_score).toBeNull();
  });

  it("baseUrl with trailing slash constructs valid endpoint URLs", async () => {
    const calls = [];
    const mockFetch = async (url) => {
      calls.push(url);
      if (url.includes("/vote/")) return { objects: [] };
      if (url.includes("/member/")) return { committee_positions: [] };
      if (url.includes("/mmm/")) return { objects: [] };
      throw new Error(`Unexpected URL: ${url}`);
    };

    await fetchParliamentaryData("test-politician", BASE_CONFIG, mockFetch);

    for (const url of calls) {
      expect(url).toMatch(/^https:\/\/oknesset\.test\/api\/v2\//);
    }
  });
});
