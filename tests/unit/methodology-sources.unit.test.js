import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const translations = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../src/locales/he/translation.json"), "utf-8")
);
const sourceConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../data-pipeline/sources.config.json"), "utf-8")
);
const readme = fs.readFileSync(path.join(__dirname, "../../README.md"), "utf-8");
const architectureDoc = fs.readFileSync(
  path.join(__dirname, "../../ai_docs/architecture/ARCH.md"),
  "utf-8"
);

const dataSources = translations.methodology.dataSources;

describe("methodology dataSources translations — source coverage", () => {
  it("hebrew field lists all Hebrew RSS globalFeed sources", () => {
    const hebrewText = dataSources.hebrew;
    // Every Hebrew news source in globalFeeds should appear in the methodology text
    expect(hebrewText).toContain("Ynet");
    expect(hebrewText).toContain("וואלה");
    expect(hebrewText).toContain("מעריב");
    expect(hebrewText).toContain("ישראל היום");
    expect(hebrewText).toContain("גלובס");
    expect(hebrewText).toContain("ערוץ 14");
    expect(hebrewText).toContain("ערוץ 13");
    expect(hebrewText).toContain("כיכר השבת");
    expect(hebrewText).toContain("i24NEWS");
    expect(hebrewText).toContain("TheMarker");
  });

  it("english field lists all English RSS globalFeed sources", () => {
    const englishText = dataSources.english;
    expect(englishText).toContain("Times of Israel");
    expect(englishText).toContain("Jerusalem Post");
    expect(englishText).toContain("i24NEWS");
  });

  it("social field lists all social platforms", () => {
    const socialText = dataSources.social;
    expect(socialText).toContain("טלגרם");
    expect(socialText).toContain("Reddit");
    expect(socialText).toContain("FXP");
    expect(socialText).toContain("Bluesky");
  });

  it("social field lists correct subreddits matching config", () => {
    const socialText = dataSources.social;
    for (const sub of sourceConfig.social.redditSubreddits) {
      if (sub === "MiddleEastNews" || sub === "worldnews") continue; // not all listed
      expect(socialText).toContain(sub);
    }
  });

  it("frequency field mentions update time", () => {
    expect(dataSources.frequency).toContain("02:00");
  });
});

describe("methodology dataSources translations — RTL safety", () => {
  it("social field wraps Reddit references with LTR marks", () => {
    const socialText = dataSources.social;
    // Unicode LTR mark (U+200E) should appear around Reddit references
    // to prevent RTL from mangling r/subreddit
    expect(socialText).toContain("\u200E");
  });

  it("r/subreddit names appear in correct LTR order", () => {
    const socialText = dataSources.social;
    // The text should contain r/ followed by the subreddit name
    expect(socialText).toMatch(/r\/Israel/);
    expect(socialText).toMatch(/r\/worldnews/);
    expect(socialText).toMatch(/r\/IsraelPolitics/);
  });

  it("social field has no carriage return characters", () => {
    expect(dataSources.social).not.toContain("\r");
  });
});

describe("methodology docs — scoring consistency", () => {
  it("keeps the plain-language README guarantees about scoring and confidence", () => {
    expect(readme).toContain("AI reads the text. The formula sets the score.");
    expect(readme).toContain("If some categories have no data on a given day");
    expect(readme).toContain("gently blended with yesterday's score");
    expect(readme).toContain("Low confidence means low confidence.");
  });

  it("does not describe the legacy 3-factor public-sentiment formula as overall_score", () => {
    expect(architectureDoc).not.toContain(
      "overall_score = 0.4 * policy_normalized + 0.35 * (1 - hostility) + 0.25 * amplification"
    );
    expect(architectureDoc).toContain("raw_overall_score = clamp(");
    expect(architectureDoc).toContain("dim_public_sentiment");
  });

  it("explains the scoring pipeline in the Hebrew methodology copy", () => {
    expect(translations.methodology.scoring.description).toContain("אם תחום מסוים חסר");
    expect(translations.methodology.scoring.description).toContain("הנוסחה הקבועה");
    expect(translations.methodology.scoring.formula).toContain("המשקל שלו מתחלק בין שאר התחומים");
    expect(translations.methodology.scoring.step3).toContain("מחליקה את התוצאה");
  });
});

describe("legal copy — safeguard retention", () => {
  it("keeps the core accuracy disclaimer even in simplified language", () => {
    const accuracy = translations.legal.accuracy.text;
    expect(accuracy).toContain("לא מתחייבים");
    expect(accuracy).toContain("לדיוק");
    expect(accuracy).toContain("לשלמות");
    expect(accuracy).toContain("לעדכניות");
    expect(accuracy).toContain("למהימנות");
  });

  it("keeps the liability disclaimer categories", () => {
    const liability = translations.legal.liability.text;
    expect(liability).toContain("ישיר");
    expect(liability).toContain("עקיף");
    expect(liability).toContain("תוצאתי");
    expect(liability).toContain("עונשי");
  });

  it("keeps the no-notice change clause", () => {
    expect(translations.legal.changes.text).toContain("ללא הודעה מוקדמת");
  });
});
