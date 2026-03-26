import { describe, it, expect } from "vitest";
import { parseChainOfThought } from "./parseChainOfThought";

describe("parseChainOfThought", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(parseChainOfThought(null)).toBeNull();
    expect(parseChainOfThought(undefined)).toBeNull();
    expect(parseChainOfThought("")).toBeNull();
  });

  it("returns legacy format for plain text without ## headers", () => {
    const text = "הסיקור על נתניהו אינטנסיבי, מגוון וברובו ביקורתי.";
    const result = parseChainOfThought(text);
    expect(result).toEqual({ isLegacy: true, raw: text });
  });

  it("parses full 3-section structured format", () => {
    const text = [
      "## שורה תחתונה",
      "נתניהו תחת מצור תקשורתי.",
      "",
      "## מה קרה",
      "• כותרת ביקורתית בהארץ",
      "• אזכור ברדיט",
      "",
      "## מה זה אומר",
      "הביקורת הציבורית מתעצמת.",
    ].join("\n");

    const result = parseChainOfThought(text);
    expect(result.isLegacy).toBe(false);
    expect(result.bottomLine).toBe("נתניהו תחת מצור תקשורתי.");
    expect(result.whatHappened).toContain("• כותרת ביקורתית בהארץ");
    expect(result.whatHappened).toContain("• אזכור ברדיט");
    expect(result.whatItMeans).toBe("הביקורת הציבורית מתעצמת.");
  });

  it("parses short 2-section format (no coverage)", () => {
    const text = [
      "## שורה תחתונה",
      "שקט מוחלט — אפילו הטרולים לקחו יום חופש.",
      "",
      "## מה זה אומר",
      "חבר כנסת שלא מדברים עליו.",
    ].join("\n");

    const result = parseChainOfThought(text);
    expect(result.isLegacy).toBe(false);
    expect(result.bottomLine).toBe("שקט מוחלט — אפילו הטרולים לקחו יום חופש.");
    expect(result.whatHappened).toBeUndefined();
    expect(result.whatItMeans).toBe("חבר כנסת שלא מדברים עליו.");
  });

  it("handles text with ## in body content (not at line start)", () => {
    const text = "ציון של ## 5 מתוך 10 — לא מרשים.";
    const result = parseChainOfThought(text);
    expect(result).toEqual({ isLegacy: true, raw: text });
  });

  it("falls back to legacy when only unknown headers are present", () => {
    const text = ["## TL;DR", "Some analysis here."].join("\n");
    const result = parseChainOfThought(text);
    expect(result).toEqual({ isLegacy: true, raw: text });
  });

  it("skips sections with no body (header only, no newline)", () => {
    const text = "## שורה תחתונה\nטקסט כלשהו.\n\n## מה קרה";
    const result = parseChainOfThought(text);
    expect(result.bottomLine).toBe("טקסט כלשהו.");
    expect(result.whatHappened).toBeUndefined();
  });
});
