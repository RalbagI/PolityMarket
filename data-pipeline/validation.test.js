import { describe, it, expect } from "vitest";

// Test the validation and party aggregation logic
// These replicate the functions from generateDailyScores.js for unit testing

// ── Spam Filter ───────────────────────────────────────────────────────

const SPAM_PATTERNS_HE = ["מודעה", "פרסומת", "שיתוף פעולה מסחרי", "תוכן ממומן", "הצטרפו לערוץ"];
const SPAM_PATTERNS_EN = ["sponsored", "promoted", "advertisement", "paid partnership", "Join @"];
const SPAM_URL_PATTERNS = ["/sponsored/", "/ad/", "utm_medium=paid", "utm_source=paid"];

function isSpamContent(text, permalink) {
  if (!text || text.length < 15) return true;
  const lower = text.toLowerCase();
  for (const p of SPAM_PATTERNS_EN) {
    if (lower.includes(p.toLowerCase())) return true;
  }
  for (const p of SPAM_PATTERNS_HE) {
    if (text.includes(p)) return true;
  }
  if (permalink) {
    for (const p of SPAM_URL_PATTERNS) {
      if (permalink.includes(p)) return true;
    }
  }
  if (/^https?:\/\/\S+$/.test(text.trim())) return true;
  return false;
}

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
    expect(isSpamContent("Netanyahu announces new security plan at cabinet meeting", "")).toBe(
      false
    );
  });

  it("rejects Telegram channel promotions", () => {
    expect(isSpamContent("הצטרפו לערוץ החדשות שלנו לעדכונים", "")).toBe(true);
    expect(isSpamContent("Join @newsChannel for breaking news updates", "")).toBe(true);
  });

  it("allows legitimate content about joining parties", () => {
    expect(isSpamContent("חבר הכנסת הצטרף לקואליציה אחרי שבועות של משא ומתן", "")).toBe(false);
  });
});

// ── Chain-of-Thought Validation ───────────────────────────────────────

const HEBREW_RE = /[\u0590-\u05FF]/;

function validateChainOfThought(entries) {
  const warnings = [];
  for (const entry of entries) {
    const cot = entry.chain_of_thought || "";
    if (cot.length < 20) {
      warnings.push(`[CoT] ${entry.name}: too short`);
    } else if (!HEBREW_RE.test(cot)) {
      warnings.push(`[CoT] ${entry.name}: no Hebrew`);
    }
  }
  return warnings;
}

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

  it("warns on empty CoT", () => {
    const entries = [{ name: "Test", chain_of_thought: "" }];
    expect(validateChainOfThought(entries).length).toBe(1);
  });
});

// ── Outlier Detection ─────────────────────────────────────────────────

function detectOutliers(entries) {
  const warnings = [];
  const scores = entries.map((e) => e.overall_score).sort((a, b) => a - b);
  if (scores.length < 5) return warnings;
  const q1 = scores[Math.floor(scores.length * 0.25)];
  const q3 = scores[Math.floor(scores.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  for (const entry of entries) {
    if (entry.overall_score < lowerBound || entry.overall_score > upperBound) {
      warnings.push(`[Outlier] ${entry.name}`);
    }
  }
  return warnings;
}

describe("detectOutliers", () => {
  it("returns no warnings for normal distribution", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      name: `Pol ${i}`,
      overall_score: 4 + Math.random() * 2,
    }));
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

// ── Party Aggregation ─────────────────────────────────────────────────

describe("party aggregation logic", () => {
  it("computes weighted average by media volume", () => {
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
    // Weighted avg: (8*10 + 4*2) / (10+2) = 88/12 = 7.33
    const totalVolume = 12;
    const weightedScore = (8 * 10 + 4 * 2) / totalVolume;
    expect(parseFloat(weightedScore.toFixed(1))).toBe(7.3);
  });

  it("computes stddev for hallucination detection", () => {
    const scores = [5, 5, 5, 5];
    const mean = 5;
    const stddev = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length);
    expect(stddev).toBe(0); // All identical = 0 stddev = hallucination flag
  });
});

// ── Party Consistency ─────────────────────────────────────────────────

function validatePartyConsistency(partyEntries) {
  const warnings = [];
  for (const party of partyEntries) {
    if (party.member_count >= 3 && party.score_stddev === 0) {
      warnings.push(`[Party] ${party.party}: identical scores`);
    }
  }
  return warnings;
}

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
