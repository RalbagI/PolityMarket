import { describe, it, expect, vi } from "vitest";

vi.mock("i18next", () => ({ default: { language: "he" } }));

const { localizeName, localizeParty } = await import("./localize");
const i18nMock = (await import("i18next")).default;

// Mock t function
const mockT = (key, options) => {
  const translations = {
    "politicians.Benjamin Netanyahu":
      "\u05D1\u05E0\u05D9\u05DE\u05D9\u05DF \u05E0\u05EA\u05E0\u05D9\u05D4\u05D5",
    "parties.Likud": "\u05D4\u05DC\u05D9\u05DB\u05D5\u05D3",
  };
  return translations[key] || options?.defaultValue || key;
};

describe("localizeName", () => {
  it("returns Hebrew name for known politician", () => {
    expect(localizeName(mockT, "Benjamin Netanyahu")).toBe(
      "\u05D1\u05E0\u05D9\u05DE\u05D9\u05DF \u05E0\u05EA\u05E0\u05D9\u05D4\u05D5"
    );
  });

  it("falls back to Hebrew transliteration for unknown politician when language is he", () => {
    i18nMock.language = "he";
    const fallback = localizeName(mockT, "Unknown Person");
    expect(fallback).not.toBe("Unknown Person");
    expect(fallback).toMatch(/[\u0590-\u05FF]/);
  });

  it("falls back to raw English name for unknown politician when language is en", () => {
    i18nMock.language = "en";
    const fallback = localizeName(mockT, "Unknown Person");
    expect(fallback).toBe("Unknown Person");
  });
});

describe("localizeParty", () => {
  it("returns Hebrew party for known party", () => {
    expect(localizeParty(mockT, "Likud")).toBe("\u05D4\u05DC\u05D9\u05DB\u05D5\u05D3");
  });

  it("falls back to English for unknown party", () => {
    expect(localizeParty(mockT, "Unknown Party")).toBe("Unknown Party");
  });
});
