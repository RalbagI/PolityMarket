import { describe, it, expect } from "vitest";
import { getPartyColor } from "./partyColors";

describe("getPartyColor", () => {
  it("returns Likud colors", () => {
    const c = getPartyColor("Likud");
    expect(c.bg).toBe("#1e40af");
    expect(c.text).toBeDefined();
    expect(c.accent).toBeDefined();
  });

  it("returns default for unknown party", () => {
    const c = getPartyColor("Nonexistent");
    expect(c.bg).toBe("#374151");
  });

  it("has colors for all 12 parties", () => {
    const parties = [
      "Likud",
      "Yesh Atid",
      "National Unity",
      "Religious Zionism",
      "Yisrael Beiteinu",
      "Shas",
      "Otzma Yehudit",
      "United Torah Judaism",
      "Labor",
      "Hadash-Taal",
      "Raam",
      "Democrats",
    ];
    for (const party of parties) {
      const c = getPartyColor(party);
      expect(c.bg).not.toBe("#374151"); // not default
    }
  });
});
