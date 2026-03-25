import { describe, it, expect } from "vitest";
import {
  buildBatchedPrompt,
  buildSearchTerms,
  buildVerificationPrompt,
  includesPolitician,
  parseCodexOutput,
  parseVerificationResponse,
  shouldRetryBatchError,
  splitPoliticiansIntoBatches,
} from "./generateDailyScores.js";

function makePolitician(id, name, party) {
  return { id, name, party, wing: "right" };
}

describe("buildBatchedPrompt", () => {
  it("renders politicians with source blocks and fallbacks", () => {
    const politicians = [
      makePolitician("alpha", "Alpha Name", "Party A"),
      makePolitician("beta", "Beta Name", "Party B"),
    ];
    const data = new Map([
      [
        "alpha",
        {
          headlines: ["Headline for Alpha"],
          socialMentions: [
            {
              text: "Mention text",
              thread_context: ["ctx-1"],
              speaker_metadata: { known_satirist: true },
            },
          ],
        },
      ],
    ]);

    const prompt = buildBatchedPrompt(politicians, data);
    expect(prompt).toContain("Score ALL 2 politicians");
    expect(prompt).toContain("[1] alpha | Alpha Name (Party A)");
    expect(prompt).toContain("Headline for Alpha");
    expect(prompt).toContain('Thread context: "ctx-1"');
    expect(prompt).toContain("[2] beta | Beta Name (Party B)");
    expect(prompt).toContain("No matched headlines");
    expect(prompt).toContain("No matched social mentions");
  });

  it("injects contextHint and rolling context for no-data politicians", () => {
    const politicians = [makePolitician("empty", "Empty Pol", "Party X")];
    const data = new Map([
      [
        "empty",
        {
          headlines: ["No direct headlines matched Empty Pol in configured sources this cycle."],
          socialMentions: [
            {
              text: "No direct social mentions matched Empty Pol in configured sources this cycle.",
            },
          ],
        },
      ],
    ]);
    const cotMap = new Map([["empty", "ניתוח קודם על פוליטיקאי זה"]]);

    const prompt = buildBatchedPrompt(politicians, data, null, null, true, cotMap);
    expect(prompt).toContain("Context note:");
    expect(prompt).toContain("Previous analysis summary:");
  });
});

describe("search term matching", () => {
  it("returns structured terms with fullNameTerms and singleTokenTerms", () => {
    const terms = buildSearchTerms(
      makePolitician("itamar-ben-gvir", "Itamar Ben Gvir", "Otzma Yehudit")
    );
    expect(terms.fullNameTerms).toContain("איתמר בן גביר");
    expect(terms.fullNameTerms).toContain("itamar ben gvir");
    expect(terms.singleTokenTerms).toContain("גביר");
    expect(terms.singleTokenTerms).not.toContain("בן");
  });

  it("returns 'exact' for full-name match", () => {
    const terms = { fullNameTerms: ["itamar ben gvir"], singleTokenTerms: ["gvir"] };
    expect(includesPolitician("Update: Itamar Ben-Gvir addressed reporters", terms)).toBe("exact");
  });

  it("returns 'partial' for single-token-only match", () => {
    const terms = { fullNameTerms: ["מאי גולן"], singleTokenTerms: ["גולן"] };
    expect(includesPolitician("תקיפה ברמת גולן — 3 פצועים", terms)).toBe("partial");
  });

  it("returns false when no terms match", () => {
    const terms = { fullNameTerms: ["מאי גולן"], singleTokenTerms: ["גולן"] };
    expect(includesPolitician("חדשות הספורט היום", terms)).toBe(false);
  });

  it("returns false for compound words (no word boundary)", () => {
    const terms = { fullNameTerms: [], singleTokenTerms: ["בן"] };
    expect(includesPolitician("הקבינט דן בבניין חדש בירושלים", terms)).toBe(false);
  });

  it("returns 'partial' when token matches as standalone word", () => {
    const terms = { fullNameTerms: [], singleTokenTerms: ["בן"] };
    expect(includesPolitician("דיווח מיוחד על בן גביר הערב", terms)).toBe("partial");
  });
});

describe("entity verification", () => {
  it("buildVerificationPrompt formats numbered items with XML-delimited text", () => {
    const batch = [
      { index: 0, text: "תקיפה ברמת גולן", fullName: "May Golan", hebrewName: "מאי גולן" },
      { index: 1, text: "סמוטריץ' הגיב", fullName: "Bezalel Smotrich", hebrewName: "בצלאל סמוטריץ'" },
    ];
    const prompt = buildVerificationPrompt(batch);
    expect(prompt).toContain('1. Politician: "מאי גולן"');
    expect(prompt).toContain("<text>תקיפה ברמת גולן</text>");
    expect(prompt).toContain('2. Politician: "בצלאל סמוטריץ\'"');
    expect(prompt).toContain("YES");
    expect(prompt).toContain("NO");
  });

  it("parseVerificationResponse parses YES/NO lines", () => {
    const batch = [
      { index: 10, text: "a", fullName: "A", hebrewName: "א" },
      { index: 11, text: "b", fullName: "B", hebrewName: "ב" },
      { index: 12, text: "c", fullName: "C", hebrewName: "ג" },
    ];
    const results = new Map();
    parseVerificationResponse("1: YES\n2: NO\n3: YES", batch, results);
    expect(results.get(10)).toBe(true);
    expect(results.get(11)).toBe(false);
    expect(results.get(12)).toBe(true);
  });

  it("parseVerificationResponse defaults to false for missing lines", () => {
    const batch = [
      { index: 0, text: "a", fullName: "A", hebrewName: "א" },
      { index: 1, text: "b", fullName: "B", hebrewName: "ב" },
    ];
    const results = new Map();
    parseVerificationResponse("1: YES", batch, results);
    expect(results.get(0)).toBe(true);
    expect(results.get(1)).toBe(false); // missing → reject
  });

  it("parseVerificationResponse handles alternate LLM formats (period, paren)", () => {
    const batch = [
      { index: 0, text: "a", fullName: "A", hebrewName: "א" },
      { index: 1, text: "b", fullName: "B", hebrewName: "ב" },
      { index: 2, text: "c", fullName: "C", hebrewName: "ג" },
    ];
    const results = new Map();
    parseVerificationResponse("1. YES\n2) NO\n3 YES", batch, results);
    expect(results.get(0)).toBe(true);
    expect(results.get(1)).toBe(false);
    expect(results.get(2)).toBe(true);
  });
});

describe("parseCodexOutput", () => {
  it("parses a valid JSON array response", () => {
    const raw =
      '[{"politician_id":"alpha","chain_of_thought":"x","hostility_level":0.1,"policy_approval":0.2,"media_amplification":0.3}]';

    const parsed = parseCodexOutput(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].politician_id).toBe("alpha");
  });

  it("strips markdown code fences and extracts JSON", () => {
    const raw =
      '```json\n[{"politician_id":"alpha","chain_of_thought":"x","hostility_level":0.1,"policy_approval":0.2,"media_amplification":0.3}]\n```';

    const parsed = parseCodexOutput(raw);
    expect(parsed).toHaveLength(1);
  });

  it("throws when content is not an array", () => {
    const raw =
      '{"politician_id":"alpha","chain_of_thought":"x","hostility_level":0.1,"policy_approval":0.2,"media_amplification":0.3}';
    expect(() => parseCodexOutput(raw)).toThrow("not an array");
  });
});

describe("shouldRetryBatchError", () => {
  it("retries parse-format failures", () => {
    expect(shouldRetryBatchError(new Error("Failed to parse Codex response as JSON"))).toBe(true);
  });

  it("does not retry missing CLI binary errors", () => {
    expect(shouldRetryBatchError(new Error("spawnSync codex ENOENT"))).toBe(false);
  });

  it("does not retry permanent auth/config errors", () => {
    expect(shouldRetryBatchError(new Error("authentication failed"))).toBe(false);
  });
});

describe("splitPoliticiansIntoBatches", () => {
  it("splits by max batch size", () => {
    const politicians = [
      makePolitician("a", "A", "P"),
      makePolitician("b", "B", "P"),
      makePolitician("c", "C", "P"),
      makePolitician("d", "D", "P"),
      makePolitician("e", "E", "P"),
    ];
    const batches = splitPoliticiansIntoBatches(politicians, new Map(), 2, 0);
    expect(batches.map((b) => b.length)).toEqual([2, 2, 1]);
  });

  it("splits by prompt-size budget", () => {
    const politicians = [
      makePolitician("a", "Alpha", "P"),
      makePolitician("b", "Beta", "P"),
      makePolitician("c", "Gamma", "P"),
    ];
    const data = new Map(
      politicians.map((p) => [
        p.id,
        {
          headlines: [`${"headline ".repeat(100)}${p.id}`],
          socialMentions: [],
        },
      ])
    );

    const oknessetMap = new Map(
      politicians.map((p) => [
        p.id,
        {
          voting_record: Array.from({ length: 10 }, (_, i) => ({
            title: `Vote ${i} ${"x".repeat(40)}`,
            vote: "for",
            date: "2026-03-24",
          })),
          mmm_requests_count: 20,
        },
      ])
    );
    const promisesDB = Object.fromEntries(
      politicians.map((p) => [
        p.id,
        {
          promises: Array.from({ length: 5 }, (_, i) => ({
            text_en: `Promise ${i} ${"text ".repeat(30)}`,
            date: "2026-01-01",
            topic: "coalition",
            context: "coalition",
            weight: 1,
          })),
        },
      ])
    );

    const singleLen = buildBatchedPrompt([politicians[0]], data, oknessetMap, promisesDB).length;
    const doubleLen = buildBatchedPrompt(
      [politicians[0], politicians[1]],
      data,
      oknessetMap,
      promisesDB
    ).length;
    const maxPromptChars = Math.floor((singleLen + doubleLen) / 2);

    const batches = splitPoliticiansIntoBatches(
      politicians,
      data,
      10,
      maxPromptChars,
      oknessetMap,
      promisesDB
    );
    expect(batches.map((b) => b.length)).toEqual([1, 1, 1]);
  });
});
