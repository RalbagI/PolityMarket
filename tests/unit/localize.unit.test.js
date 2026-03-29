import { describe, it, expect } from "vitest";
import { transliterateToHebrew, localizeParty } from "../../src/lib/localize";

describe("localize utility boilerplate", () => {
  it("transliterates latin text to a stable Hebrew-like output", () => {
    const result = transliterateToHebrew("Benjamin Netanyahu");

    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("keeps party value as fallback when translation key is missing", () => {
    const t = (_key, options) => options.defaultValue;

    expect(localizeParty(t, "Test Party")).toBe("Test Party");
  });
});
