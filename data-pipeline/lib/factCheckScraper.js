/**
 * Fact-check data scraper for Israeli political statements.
 *
 * Currently targets Globes Whistle (המשרוקית) — the fact-checking
 * section of the Globes business newspaper.
 *
 * FRAGILE SCRAPER: website structure changes will break this.
 * All errors return null — never throws. Treat as supplemental data only.
 */

/** In-memory cache: cacheKey → number|null */
const _cache = new Map();

/**
 * Scrape a fact-check score for a politician from Globes Whistle.
 *
 * @param {string} politicianName - English name (e.g. "Benjamin Netanyahu")
 * @param {string} hebrewName     - Hebrew name for matching (e.g. "בנימין נתניהו")
 * @param {Function} [_fetchText] - Injectable fetch function for testing
 * @returns {Promise<number|null>} 0–1 score (1=all claims verified true, 0=all false), or null
 */
export async function scrapeFactCheckScore(politicianName, hebrewName, _fetchText) {
  const cacheKey = `${politicianName}|${hebrewName ?? ""}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const fetchText = _fetchText ?? defaultFetchText;

  try {
    // FRAGILE: warn on every run so operators can detect scraper health degradation
    console.warn(
      "[FactCheck] FRAGILE SCRAPER: Globes Whistle — null returned on any structure change"
    );

    const html = await fetchText(
      "https://www.globes.co.il/news/category.aspx?iid=2005"
    );

    if (!html || html.length < 1000) {
      _cache.set(cacheKey, null);
      return null;
    }

    const nameToMatch = hebrewName || politicianName;
    if (!nameToMatch) {
      _cache.set(cacheKey, null);
      return null;
    }

    // Find article blocks that mention this politician
    const articleBlockRe =
      /<article[^>]*>[\s\S]*?<\/article>|<li[^>]*class="[^"]*whistle[^"]*"[^>]*>[\s\S]*?<\/li>/gi;
    const articleBlocks = [...html.matchAll(articleBlockRe)].map((m) => m[0]);

    const nameRe = new RegExp(escapeRegex(nameToMatch), "");

    let trueCount = 0;
    let falseCount = 0;

    for (const block of articleBlocks) {
      if (!nameRe.test(block)) continue;

      const lower = block.toLowerCase();
      // Hebrew true indicators
      if (
        block.includes("נכון") ||
        block.includes("אמת") ||
        block.includes("מדויק")
      )
        trueCount++;
      // Hebrew false/misleading indicators
      if (
        block.includes("שקר") ||
        block.includes("לא נכון") ||
        block.includes("מטעה") ||
        block.includes("חלקי")
      )
        falseCount++;
      // English fallback
      if (lower.includes("true") || lower.includes("correct")) trueCount++;
      if (lower.includes("false") || lower.includes("mislead")) falseCount++;
    }

    const total = trueCount + falseCount;
    const score = total > 0 ? trueCount / total : null;

    _cache.set(cacheKey, score);
    return score;
  } catch (err) {
    console.warn(
      `[FactCheck] Failed to scrape for "${politicianName}": ${err.message}`
    );
    _cache.set(cacheKey, null);
    return null;
  }
}

/** Clear cache between runs and in tests. */
export function clearCache() {
  _cache.clear();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function defaultFetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PolityMarketPipeline/1.0",
        "Accept-Language": "he-IL,he;q=0.9,en;q=0.5",
      },
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
