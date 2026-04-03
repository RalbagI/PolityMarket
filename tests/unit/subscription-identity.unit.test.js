import { describe, expect, it } from "vitest";
import {
  buildSubscriptionDocId,
  createSubscriptionToken,
  extractSubscriptionDocId,
  normalizeEmail,
} from "../../functions/lib/subscriptionIdentity.js";

describe("subscription identity helpers", () => {
  it("normalizes emails before deriving document ids", () => {
    expect(normalizeEmail("  USER@Test.COM ")).toBe("user@test.com");
    expect(buildSubscriptionDocId("USER@Test.COM")).toBe(
      buildSubscriptionDocId("user@test.com")
    );
  });

  it("creates deterministic hashed document ids", () => {
    expect(buildSubscriptionDocId("user@test.com")).toMatch(/^sub_[a-f0-9]{32}$/);
  });

  it("embeds the document id into newly issued tokens", () => {
    const docId = buildSubscriptionDocId("user@test.com");
    const token = createSubscriptionToken("user@test.com");

    expect(token.startsWith(`${docId}.`)).toBe(true);
    expect(extractSubscriptionDocId(token)).toBe(docId);
  });

  it("returns null for tokens without an embedded document id", () => {
    expect(extractSubscriptionDocId("legacy-random-token")).toBeNull();
  });
});
