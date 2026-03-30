import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "sources.config.json"), "utf-8")
);

describe("sources.config.json — structure", () => {
  it("has required top-level sections", () => {
    expect(config).toHaveProperty("rss");
    expect(config).toHaveProperty("openKnesset");
    expect(config).toHaveProperty("social");
  });

  it("rss has searchTemplates and globalFeeds arrays", () => {
    expect(Array.isArray(config.rss.searchTemplates)).toBe(true);
    expect(Array.isArray(config.rss.globalFeeds)).toBe(true);
    expect(config.rss.searchTemplates.length).toBeGreaterThanOrEqual(4);
    expect(config.rss.globalFeeds.length).toBeGreaterThanOrEqual(7);
  });

  it("all searchTemplates contain {query} placeholder", () => {
    for (const tpl of config.rss.searchTemplates) {
      expect(tpl).toContain("{query}");
    }
  });

  it("all globalFeeds are valid URLs", () => {
    for (const url of config.rss.globalFeeds) {
      expect(() => new URL(url)).not.toThrow();
      expect(url).toMatch(/^https?:\/\//);
    }
  });

  it("all searchTemplates are valid URL patterns", () => {
    for (const tpl of config.rss.searchTemplates) {
      const testUrl = tpl.replace("{query}", "test");
      expect(() => new URL(testUrl)).not.toThrow();
    }
  });
});

describe("sources.config.json — required news sources", () => {
  const feeds = config.rss.globalFeeds;
  const templates = config.rss.searchTemplates;

  it("includes Ynet", () => {
    expect(feeds.some((u) => u.includes("ynet.co.il"))).toBe(true);
  });

  it("includes Walla", () => {
    expect(feeds.some((u) => u.includes("walla.co.il"))).toBe(true);
  });

  it("includes Maariv", () => {
    expect(feeds.some((u) => u.includes("maariv.co.il"))).toBe(true);
  });

  it("includes Israel Hayom", () => {
    expect(feeds.some((u) => u.includes("israelhayom.co.il"))).toBe(true);
  });

  it("includes Globes", () => {
    expect(feeds.some((u) => u.includes("globes.co.il"))).toBe(true);
  });

  it("includes Channel 14 (c14)", () => {
    expect(feeds.some((u) => u.includes("c14.co.il"))).toBe(true);
  });

  it("includes Times of Israel", () => {
    expect(feeds.some((u) => u.includes("timesofisrael.com"))).toBe(true);
  });

  it("includes Channel 13 (13news)", () => {
    expect(feeds.some((u) => u.includes("13news.co.il"))).toBe(true);
  });

  it("includes Jerusalem Post", () => {
    expect(feeds.some((u) => u.includes("jpost.com"))).toBe(true);
  });

  it("includes TheMarker", () => {
    expect(feeds.some((u) => u.includes("themarker.com"))).toBe(true);
  });

  it("includes KikarHashabat via search template", () => {
    expect(templates.some((u) => u.includes("kikar.co.il"))).toBe(true);
  });

  it("includes i24NEWS via search template", () => {
    expect(templates.some((u) => u.includes("i24news.tv"))).toBe(true);
  });
});

describe("sources.config.json — social sources", () => {
  it("has reddit subreddits", () => {
    expect(config.social.redditSubreddits).toContain("Israel");
    expect(config.social.redditSubreddits).toContain("IsraelPolitics");
  });

  it("has telegram channels", () => {
    expect(config.social.telegram.channels.length).toBeGreaterThanOrEqual(5);
  });

  it("has FXP forums", () => {
    expect(config.social.fxp.forumIds.length).toBeGreaterThanOrEqual(2);
  });

  it("has Bluesky enabled", () => {
    expect(config.social.bluesky.enabled).toBe(true);
  });
});

describe("sources.config.json — no duplicates", () => {
  it("globalFeeds has no duplicate URLs", () => {
    const unique = new Set(config.rss.globalFeeds);
    expect(unique.size).toBe(config.rss.globalFeeds.length);
  });

  it("searchTemplates has no duplicate URLs", () => {
    const unique = new Set(config.rss.searchTemplates);
    expect(unique.size).toBe(config.rss.searchTemplates.length);
  });
});
