import { describe, it, expect } from "vitest";
import { localizeName, localizeParty } from "./localize";

// Mock t function
const mockT = (key, options) => {
  const translations = {
    "politicians.Benjamin Netanyahu": "בנימין נתניהו",
    "parties.Likud": "הליכוד",
  };
  return translations[key] || options?.defaultValue || key;
};

describe("localizeName", () => {
  it("returns Hebrew name for known politician", () => {
    expect(localizeName(mockT, "Benjamin Netanyahu")).toBe("בנימין נתניהו");
  });

  it("falls back to English for unknown politician", () => {
    expect(localizeName(mockT, "Unknown Person")).toBe("Unknown Person");
  });
});

describe("localizeParty", () => {
  it("returns Hebrew party for known party", () => {
    expect(localizeParty(mockT, "Likud")).toBe("הליכוד");
  });

  it("falls back to English for unknown party", () => {
    expect(localizeParty(mockT, "Unknown Party")).toBe("Unknown Party");
  });
});
