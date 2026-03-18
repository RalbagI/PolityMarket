import { describe, it, expect } from "vitest";
import parseLLMResponse, {
  llmResponseSchema,
  dailyEntrySchema,
  summaryRowSchema,
} from "./lib/parseLLMResponse.js";

describe("parseLLMResponse", () => {
  const validResponse = JSON.stringify({
    chain_of_thought: "Analysis of political coverage today.",
    hostility_level: 0.3,
    policy_approval: 0.5,
    media_amplification: 0.7,
  });

  it("parses valid JSON response", () => {
    const result = parseLLMResponse(validResponse);
    expect(result.chain_of_thought).toBe("Analysis of political coverage today.");
    expect(result.hostility_level).toBe(0.3);
    expect(result.policy_approval).toBe(0.5);
    expect(result.media_amplification).toBe(0.7);
  });

  it("strips markdown code fences", () => {
    const wrapped = "```json\n" + validResponse + "\n```";
    const result = parseLLMResponse(wrapped);
    expect(result.hostility_level).toBe(0.3);
  });

  it("strips code fences without json tag", () => {
    const wrapped = "```\n" + validResponse + "\n```";
    const result = parseLLMResponse(wrapped);
    expect(result.policy_approval).toBe(0.5);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseLLMResponse("not json")).toThrow("Invalid JSON from LLM");
  });

  it("throws on empty chain_of_thought", () => {
    const bad = JSON.stringify({
      chain_of_thought: "",
      hostility_level: 0.5,
      policy_approval: 0.0,
      media_amplification: 0.5,
    });
    expect(() => parseLLMResponse(bad)).toThrow("chain_of_thought");
  });

  it("throws on missing chain_of_thought", () => {
    const bad = JSON.stringify({
      hostility_level: 0.5,
      policy_approval: 0.0,
      media_amplification: 0.5,
    });
    expect(() => parseLLMResponse(bad)).toThrow("chain_of_thought");
  });

  it("throws on hostility_level > 1", () => {
    const bad = JSON.stringify({
      chain_of_thought: "text",
      hostility_level: 1.5,
      policy_approval: 0.0,
      media_amplification: 0.5,
    });
    expect(() => parseLLMResponse(bad)).toThrow("hostility_level");
  });

  it("throws on hostility_level < 0", () => {
    const bad = JSON.stringify({
      chain_of_thought: "text",
      hostility_level: -0.1,
      policy_approval: 0.0,
      media_amplification: 0.5,
    });
    expect(() => parseLLMResponse(bad)).toThrow("hostility_level");
  });

  it("throws on policy_approval > 1", () => {
    const bad = JSON.stringify({
      chain_of_thought: "text",
      hostility_level: 0.5,
      policy_approval: 1.1,
      media_amplification: 0.5,
    });
    expect(() => parseLLMResponse(bad)).toThrow("policy_approval");
  });

  it("throws on policy_approval < -1", () => {
    const bad = JSON.stringify({
      chain_of_thought: "text",
      hostility_level: 0.5,
      policy_approval: -1.1,
      media_amplification: 0.5,
    });
    expect(() => parseLLMResponse(bad)).toThrow("policy_approval");
  });

  it("throws on media_amplification > 1", () => {
    const bad = JSON.stringify({
      chain_of_thought: "text",
      hostility_level: 0.5,
      policy_approval: 0.0,
      media_amplification: 1.5,
    });
    expect(() => parseLLMResponse(bad)).toThrow("media_amplification");
  });

  it("throws on non-number hostility_level", () => {
    const bad = JSON.stringify({
      chain_of_thought: "text",
      hostility_level: "high",
      policy_approval: 0.0,
      media_amplification: 0.5,
    });
    expect(() => parseLLMResponse(bad)).toThrow("hostility_level");
  });

  it("accepts boundary values (0, 1, -1)", () => {
    const boundary = JSON.stringify({
      chain_of_thought: "boundary test",
      hostility_level: 0,
      policy_approval: -1,
      media_amplification: 1,
    });
    const result = parseLLMResponse(boundary);
    expect(result.hostility_level).toBe(0);
    expect(result.policy_approval).toBe(-1);
    expect(result.media_amplification).toBe(1);
  });

  it("includes field-level error details in message", () => {
    const bad = JSON.stringify({
      chain_of_thought: "",
      hostility_level: 2,
      policy_approval: "bad",
      media_amplification: -1,
    });
    try {
      parseLLMResponse(bad);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e.message).toContain("chain_of_thought");
      expect(e.message).toContain("hostility_level");
    }
  });

  it("strips extra fields (no passthrough)", () => {
    const extra = JSON.stringify({
      chain_of_thought: "text",
      hostility_level: 0.5,
      policy_approval: 0.0,
      media_amplification: 0.5,
      extra_field: "should be stripped",
      overall_score: 99,
    });
    const result = parseLLMResponse(extra);
    expect(result.extra_field).toBeUndefined();
    expect(result.overall_score).toBeUndefined();
  });
});

describe("llmResponseSchema", () => {
  it("validates correct shape", () => {
    const result = llmResponseSchema.safeParse({
      chain_of_thought: "test",
      hostility_level: 0.5,
      policy_approval: 0.0,
      media_amplification: 0.5,
    });
    expect(result.success).toBe(true);
  });
});

describe("dailyEntrySchema", () => {
  it("validates a complete daily entry", () => {
    const result = dailyEntrySchema.safeParse({
      date: "2026-03-18",
      politician_id: "test-pol",
      name: "Test Politician",
      party: "Test Party",
      hostility_level: 0.3,
      policy_approval: 0.5,
      media_amplification: 0.7,
      overall_score: 6.5,
      chain_of_thought: "analysis",
      news_sentiment: 7.5,
      social_sentiment: 7.0,
      media_volume: 7.0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = dailyEntrySchema.safeParse({
      date: "March 18",
      politician_id: "test",
      name: "Test",
      party: "Test",
      hostility_level: 0.3,
      policy_approval: 0.5,
      media_amplification: 0.7,
      overall_score: 6.5,
      chain_of_thought: "x",
      news_sentiment: 7.5,
      social_sentiment: 7.0,
      media_volume: 7.0,
    });
    expect(result.success).toBe(false);
  });
});

describe("summaryRowSchema", () => {
  it("validates a summary row", () => {
    const result = summaryRowSchema.safeParse({
      date: "2026-03-18",
      politician_id: "test-pol",
      name: "Test",
      party: "Test",
      overall_score: 6.5,
      media_volume: 7.0,
    });
    expect(result.success).toBe(true);
  });
});
