import { describe, it, expect } from "vitest";
import {
  aggregateParties,
  detectOutliers,
  isSpamContent,
  validateChainOfThought,
  validatePartyConsistency,
  validateTemporalConsistency,
} from "./lib/validation.js";

describe("isSpamContent", () => {
  it("rejects short text (<15 chars)", () => {
    expect(isSpamContent("short", "")).toBe(true);
  });

  it("rejects empty/null text", () => {
    expect(isSpamContent("", "")).toBe(true);
    expect(isSpamContent(null, "")).toBe(true);
  });

  it("rejects English sponsored content", () => {
    expect(isSpamContent("This is a sponsored post about politics", "")).toBe(true);
    expect(isSpamContent("Promoted content: check out this deal", "")).toBe(true);
  });

  it("rejects Hebrew sponsored content", () => {
    expect(isSpamContent("זוהי מודעה פוליטית של מפלגת הליכוד", "")).toBe(true);
    expect(isSpamContent("תוכן ממומן על ידי ארגון פוליטי", "")).toBe(true);
  });

  it("rejects sponsored URLs", () => {
    expect(isSpamContent("ראש הממשלה בנאום חשוב", "https://example.com/sponsored/article")).toBe(
      true
    );
    expect(isSpamContent("ראש הממשלה בנאום חשוב", "https://example.com?utm_medium=paid")).toBe(
      true
    );
  });

  it("rejects pure URLs", () => {
    expect(isSpamContent("https://example.com/article/12345", "")).toBe(true);
  });

  it("accepts legitimate political content", () => {
    expect(isSpamContent("ראש הממשלה נתניהו הודיע על הסכם חדש עם ארצות הברית", "")).toBe(false);
    expect(isSpamContent("Netanyahu announces new security plan at cabinet meeting", "")).toBe(false);
  });

  it("rejects Telegram channel promotions", () => {
    expect(isSpamContent("הצטרפו לערוץ החדשות שלנו לעדכונים", "")).toBe(true);
    expect(isSpamContent("Join @newsChannel for breaking news updates", "")).toBe(true);
  });

  it("allows legitimate content about joining parties", () => {
    expect(isSpamContent("חבר הכנסת הצטרף לקואליציה אחרי שבועות של משא ומתן", "")).toBe(false);
  });
});

describe("validateChainOfThought", () => {
  it("returns no warnings for valid Hebrew CoT", () => {
    const entries = [{ name: "Test", chain_of_thought: "ניתוח מפורט של הסנטימנט הפוליטי" }];
    expect(validateChainOfThought(entries)).toEqual([]);
  });

  it("warns on short CoT", () => {
    const entries = [{ name: "Test", chain_of_thought: "קצר" }];
    expect(validateChainOfThought(entries).length).toBe(1);
    expect(validateChainOfThought(entries)[0]).toContain("too short");
  });

  it("warns on non-Hebrew CoT", () => {
    const entries = [
      { name: "Test", chain_of_thought: "This is entirely in English with no Hebrew at all here" },
    ];
    expect(validateChainOfThought(entries).length).toBe(1);
    expect(validateChainOfThought(entries)[0]).toContain("no Hebrew");
  });
});

describe("validateTemporalConsistency", () => {
  it("returns no warning when score is within threshold", () => {
    const entries = [{ name: "Test", politician_id: "p1", overall_score: 5.4 }];
    const history = [
      { politician_id: "p1", overall_score: 5.0 },
      { politician_id: "p1", overall_score: 5.0 },
      { politician_id: "p1", overall_score: 5.0 },
    ];
    expect(validateTemporalConsistency(entries, history)).toEqual([]);
  });

  it("flags major deviation from history", () => {
    const entries = [{ name: "Test", politician_id: "p1", overall_score: 9.0 }];
    const history = [
      { politician_id: "p1", overall_score: 5.0 },
      { politician_id: "p1", overall_score: 5.0 },
      { politician_id: "p1", overall_score: 5.0 },
    ];
    const warnings = validateTemporalConsistency(entries, history);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("[Temporal]");
  });
});

describe("detectOutliers", () => {
  it("returns no warnings for compact distribution", () => {
    const entries = [
      { name: "A", overall_score: 4.8 },
      { name: "B", overall_score: 4.9 },
      { name: "C", overall_score: 5.0 },
      { name: "D", overall_score: 5.1 },
      { name: "E", overall_score: 5.2 },
      { name: "F", overall_score: 5.0 },
    ];
    expect(detectOutliers(entries).length).toBe(0);
  });

  it("flags extreme outliers", () => {
    const entries = [
      ...Array.from({ length: 20 }, (_, i) => ({ name: `Normal ${i}`, overall_score: 5 })),
      { name: "Outlier", overall_score: 0.1 },
    ];
    const warnings = detectOutliers(entries);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("Outlier");
  });

  it("skips with fewer than 5 entries", () => {
    const entries = [{ name: "A", overall_score: 1 }];
    expect(detectOutliers(entries)).toEqual([]);
  });
});

describe("aggregateParties", () => {
  it("computes weighted average by media volume and top politician", () => {
    const entries = [
      {
        party: "Likud",
        wing: "right",
        overall_score: 8,
        media_volume: 10,
        hostility_level: 0.2,
        policy_approval: 0.5,
        media_amplification: 0.7,
        politician_id: "a",
      },
      {
        party: "Likud",
        wing: "right",
        overall_score: 4,
        media_volume: 2,
        hostility_level: 0.6,
        policy_approval: -0.3,
        media_amplification: 0.3,
        politician_id: "b",
      },
    ];

    const [likud] = aggregateParties(entries, "2026-03-23");
    expect(likud.overall_score).toBe(7.3);
    expect(likud.media_volume).toBe(12);
    expect(likud.top_politician).toBe("a");
  });
});

describe("validatePartyConsistency", () => {
  it("flags party with all identical scores", () => {
    const parties = [{ party: "TestParty", member_count: 5, score_stddev: 0 }];
    expect(validatePartyConsistency(parties).length).toBe(1);
  });

  it("passes party with varying scores", () => {
    const parties = [{ party: "TestParty", member_count: 5, score_stddev: 0.8 }];
    expect(validatePartyConsistency(parties)).toEqual([]);
  });

  it("skips small parties (< 3 members)", () => {
    const parties = [{ party: "SmallParty", member_count: 2, score_stddev: 0 }];
    expect(validatePartyConsistency(parties)).toEqual([]);
  });
});
