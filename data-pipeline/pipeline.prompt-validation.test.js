/**
 * Pipeline prompt validation — bulletproof pre-merge gate.
 *
 * Validates that the system prompt, Zod schemas, and frontend parser
 * are all consistent with each other. Catches schema drift, missing
 * fields, and prompt/schema mismatches BEFORE code reaches main.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { llmResponseSchema8dim, dailyEntrySchema8dim } from "./lib/parseLLMResponse.js";
import { parseChainOfThought } from "../src/lib/parseChainOfThought.js";

const promptPath = path.join(import.meta.dirname || ".", "prompts", "system-prompt.txt");
const prompt = fs.readFileSync(promptPath, "utf-8");

// Extract JSON objects from few-shot examples in the prompt
function extractFewShotExamples(promptText) {
  const examples = [];
  const jsonRegex = /\{"politician_id":[^\n]+\}/g;
  let match;
  while ((match = jsonRegex.exec(promptText)) !== null) {
    try {
      examples.push(JSON.parse(match[0]));
    } catch {
      // skip malformed JSON
    }
  }
  return examples;
}

const examples = extractFewShotExamples(prompt);

// ── Few-Shot Example Validation ───────────────────────────────────────

describe("system prompt few-shot examples validate against Zod schema", () => {
  it("has at least 3 few-shot examples", () => {
    expect(examples.length).toBeGreaterThanOrEqual(3);
  });

  for (const [i, example] of examples.entries()) {
    describe(`example ${i + 1} (${example.politician_id})`, () => {
      it("passes llmResponseSchema8dim validation", () => {
        const result = llmResponseSchema8dim.safeParse(example);
        if (!result.success) {
          const errors = result.error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; ");
          throw new Error(`Example ${i + 1} failed schema validation: ${errors}`);
        }
        expect(result.success).toBe(true);
      });

      it("has non-empty chain_of_thought in Hebrew", () => {
        expect(example.chain_of_thought).toBeTruthy();
        expect(example.chain_of_thought.length).toBeGreaterThan(20);
        expect(/[\u0590-\u05FF]/.test(example.chain_of_thought)).toBe(true);
      });

      it("has non-empty chain_of_thought_en in English", () => {
        expect(example.chain_of_thought_en).toBeTruthy();
        expect(example.chain_of_thought_en.length).toBeGreaterThan(20);
        expect(/[a-zA-Z]/.test(example.chain_of_thought_en)).toBe(true);
      });

      it("Hebrew chain_of_thought parses with parseChainOfThought", () => {
        const parsed = parseChainOfThought(example.chain_of_thought);
        expect(parsed).not.toBeNull();
        expect(parsed.isLegacy).toBe(false);
        expect(parsed.bottomLine).toBeTruthy();
      });

      it("English chain_of_thought_en parses with parseChainOfThought", () => {
        const parsed = parseChainOfThought(example.chain_of_thought_en);
        expect(parsed).not.toBeNull();
        expect(parsed.isLegacy).toBe(false);
        expect(parsed.bottomLine).toBeTruthy();
      });
    });
  }
});

// ── Prompt / Schema Consistency ───────────────────────────────────────

describe("system prompt schema line matches Zod schema fields", () => {
  // Extract the JSON schema line from the prompt (the last {...} line)
  const schemaLineMatch = prompt.match(/\{"politician_id":"string"[^\n]+\}\s*$/m);

  it("has a JSON schema line in the prompt", () => {
    expect(schemaLineMatch).not.toBeNull();
  });

  it("schema line contains all required LLM response fields", () => {
    const schemaLine = schemaLineMatch[0];
    const requiredFields = [
      "politician_id",
      "chain_of_thought",
      "chain_of_thought_en",
      "hostility_level",
      "policy_approval",
      "media_amplification",
      "media_credibility_score",
      "tv_radio_mentions",
      "satire_mentions_count",
      "satire_tone",
      "field_activities_confirmed",
      "transparency_ethics_score",
      "lobbyist_meetings_count",
      "legislative_pro_socioeconomic_ratio",
      "agenda_setting_score",
      "flipflop_contradictions",
      "flipflop_promises_checked",
    ];
    for (const field of requiredFields) {
      expect(schemaLine).toContain(`"${field}"`);
    }
  });

  it("dailyEntrySchema8dim accepts chain_of_thought_en", () => {
    expect(dailyEntrySchema8dim.shape.chain_of_thought_en).toBeDefined();
  });
});

// ── Bilingual Header Consistency ──────────────────────────────────────

describe("bilingual header consistency", () => {
  it("prompt instructs Hebrew headers", () => {
    expect(prompt).toContain("## שורה תחתונה");
    expect(prompt).toContain("## מה קרה");
    expect(prompt).toContain("## מה זה אומר");
  });

  it("prompt instructs English headers", () => {
    expect(prompt).toContain("## Bottom Line");
    expect(prompt).toContain("## What Happened");
    expect(prompt).toContain("## What It Means");
  });

  it("parseChainOfThought handles both Hebrew and English headers", () => {
    const he = parseChainOfThought(
      "## שורה תחתונה\ntest he.\n\n## מה קרה\n• item\n\n## מה זה אומר\nmeaning."
    );
    const en = parseChainOfThought(
      "## Bottom Line\ntest en.\n\n## What Happened\n• item\n\n## What It Means\nmeaning."
    );
    expect(he.bottomLine).toBe("test he.");
    expect(en.bottomLine).toBe("test en.");
    expect(he.whatHappened).toContain("• item");
    expect(en.whatHappened).toContain("• item");
  });
});
