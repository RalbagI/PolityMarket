import { describe, it, expect } from "vitest";
import {
  buildBatchedPrompt,
  buildSearchTerms,
  includesPolitician,
  parseClaudeCliOutput,
  shouldRetryClaudeBatchError,
  splitPoliticiansIntoBatches,
} from "./generateDailyScores.js";

function makePolitician(id, name, party) {
  return { id, name, party };
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
});

describe("search term matching", () => {
  it("filters common short Hebrew tokens while preserving useful terms", () => {
    const terms = buildSearchTerms(makePolitician("itamar-ben-gvir", "Itamar Ben Gvir", "Otzma Yehudit"));
    expect(terms).toContain("איתמר בן גביר");
    expect(terms).toContain("גביר");
    expect(terms).not.toContain("בן");
  });

  it("matches on word boundaries instead of raw substrings", () => {
    expect(includesPolitician("הקבינט דן בבניין חדש בירושלים", ["בן"])).toBe(false);
    expect(includesPolitician("דיווח מיוחד על בן גביר הערב", ["בן"])).toBe(true);
    expect(includesPolitician("Update: Itamar Ben-Gvir addressed reporters", ["itamar ben gvir"])).toBe(
      true
    );
  });
});

describe("parseClaudeCliOutput", () => {
  it("parses a valid Claude CLI envelope", () => {
    const raw = JSON.stringify({
      is_error: false,
      duration_ms: 1234,
      total_cost_usd: 0.0123,
      result:
        '[{"politician_id":"alpha","chain_of_thought":"x","hostility_level":0.1,"policy_approval":0.2,"media_amplification":0.3}]',
    });

    const parsed = parseClaudeCliOutput(raw);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].politician_id).toBe("alpha");
    expect(parsed.durationMs).toBe(1234);
    expect(parsed.totalCostUsd).toBe(0.0123);
  });

  it("extracts JSON arrays when wrapped in extra text", () => {
    const raw = JSON.stringify({
      is_error: false,
      result:
        'Model output:\n```json\n[{"politician_id":"alpha","chain_of_thought":"x","hostility_level":0.1,"policy_approval":0.2,"media_amplification":0.3}]\n```\nDone.',
    });

    const parsed = parseClaudeCliOutput(raw);
    expect(parsed.results).toHaveLength(1);
  });

  it("throws when content is not an array", () => {
    const raw = JSON.stringify({
      is_error: false,
      result:
        '{"politician_id":"alpha","chain_of_thought":"x","hostility_level":0.1,"policy_approval":0.2,"media_amplification":0.3}',
    });
    expect(() => parseClaudeCliOutput(raw)).toThrow("not an array");
  });
});

describe("shouldRetryClaudeBatchError", () => {
  it("retries parse-format failures", () => {
    expect(shouldRetryClaudeBatchError(new Error("Failed to parse Claude response as JSON"))).toBe(
      true
    );
  });

  it("does not retry missing CLI binary errors", () => {
    expect(shouldRetryClaudeBatchError(new Error("spawnSync claude ENOENT"))).toBe(false);
  });

  it("does not retry permanent auth/config errors", () => {
    expect(shouldRetryClaudeBatchError(new Error("Claude CLI error: authentication failed"))).toBe(
      false
    );
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

    const singleLen = buildBatchedPrompt([politicians[0]], data).length;
    const doubleLen = buildBatchedPrompt([politicians[0], politicians[1]], data).length;
    const maxPromptChars = Math.floor((singleLen + doubleLen) / 2);

    const batches = splitPoliticiansIntoBatches(politicians, data, 10, maxPromptChars);
    expect(batches.map((b) => b.length)).toEqual([1, 1, 1]);
  });
});
