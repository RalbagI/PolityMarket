import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGISTRY_PATH = path.join(__dirname, "..", "source-registry.json");

let sourceRegistryCache = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function roundTo(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function loadSourceRegistry() {
  if (sourceRegistryCache) return sourceRegistryCache;
  const parsed = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  sourceRegistryCache = parsed.sources ?? [];
  return sourceRegistryCache;
}

export function clearSourceRegistryCache() {
  sourceRegistryCache = null;
}

function inferSourceFromHint(hint, registry) {
  const normalizedHint = normalizeText(hint);
  if (!normalizedHint) return null;
  return (
    registry.find((source) =>
      (source.aliases ?? []).some((alias) => normalizeText(alias) === normalizedHint)
    ) ?? null
  );
}

export function resolveSourceMeta({ url = "", hint = "", fallbackName = "" } = {}) {
  const registry = loadSourceRegistry();
  const hinted = inferSourceFromHint(hint || fallbackName, registry);
  if (hinted) return hinted;

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const matched = registry.find((source) =>
      (source.domains ?? []).some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain.replace(/^\./, "")}`)
      )
    );
    if (matched) return matched;
  } catch {
    // Ignore malformed URLs and fall back below.
  }

  return (
    inferSourceFromHint(fallbackName, registry) ?? {
      source_id: normalizeText(fallbackName || hint || "unknown").replace(/\s+/g, "-") || "unknown",
      source_name: fallbackName || hint || "Unknown",
      source_type: "unknown",
      ideology_bucket: "mixed",
      visibility_weight: 0.3,
      consensus_weight_cap: 0.2,
      use_in_consensus: false,
      domains: [],
      aliases: [],
    }
  );
}

export function stripPublisherArtifacts(text, sourceMeta = null) {
  const source = sourceMeta ?? resolveSourceMeta({});
  let cleaned = String(text ?? "").trim();

  cleaned = cleaned.replace(/\s*[-–|]\s*Google News$/i, "").trim();
  for (const alias of source.aliases ?? []) {
    if (!alias) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned
      .replace(new RegExp(`\\s*[-–|]\\s*${escaped}$`, "i"), "")
      .replace(new RegExp(`^${escaped}\\s*[-–|]\\s*`, "i"), "")
      .trim();
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

export function buildEvidenceItem({
  sourceMeta,
  url,
  publishedAt = null,
  matchedText = "",
  entitySnippet = "",
  quote = "",
  isDirectEntityMatch = true,
}) {
  const source = sourceMeta ?? resolveSourceMeta({ url });
  return {
    source_id: source.source_id,
    source_name: source.source_name,
    source_type: source.source_type,
    url: url || "",
    published_at: publishedAt || null,
    matched_text: matchedText.trim(),
    entity_snippet: entitySnippet.trim(),
    quote: quote.trim(),
    is_direct_entity_match: Boolean(isDirectEntityMatch),
  };
}

function zScore(value, avg, stddev, fallbackStd = 0.35) {
  const safeStd = stddev > 0 ? stddev : fallbackStd;
  return (value - avg) / safeStd;
}

function computeNormalizedEntropy(weights) {
  const values = Object.values(weights).filter((value) => value > 0);
  if (values.length <= 1) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  const entropy = values.reduce((sum, value) => {
    const probability = value / total;
    return sum - probability * Math.log2(probability);
  }, 0);
  return entropy / Math.log2(values.length);
}

export function buildSourceBaselines(historicalEntries = [], windowStartDate = null) {
  const buckets = new Map();

  for (const entry of historicalEntries) {
    if (!Array.isArray(entry?.evidence_items) || !entry.evidence_items.length) continue;
    if (windowStartDate && typeof entry.date === "string" && entry.date < windowStartDate) continue;
    const seenSources = new Set();
    for (const evidence of entry.evidence_items) {
      const sourceMeta = resolveSourceMeta({
        url: evidence?.url,
        hint: evidence?.source_name || evidence?.source_id,
        fallbackName: evidence?.source_name || evidence?.source_id,
      });
      if (sourceMeta.use_in_consensus === false) continue;
      const sourceId = sourceMeta.source_id;
      if (!sourceId || seenSources.has(sourceId)) continue;
      seenSources.add(sourceId);
      if (!buckets.has(sourceId)) {
        buckets.set(sourceId, {
          policy: [],
          inverseHostility: [],
          amplification: [],
        });
      }
      const bucket = buckets.get(sourceId);
      if (Number.isFinite(entry.policy_approval)) bucket.policy.push(entry.policy_approval);
      if (Number.isFinite(entry.hostility_level)) {
        bucket.inverseHostility.push(1 - entry.hostility_level);
      }
      if (Number.isFinite(entry.media_amplification)) {
        bucket.amplification.push(entry.media_amplification);
      }
    }
  }

  const baselines = new Map();
  for (const [sourceId, metrics] of buckets.entries()) {
    baselines.set(sourceId, {
      policy_mean: mean(metrics.policy),
      policy_stddev: standardDeviation(metrics.policy),
      inverse_hostility_mean: mean(metrics.inverseHostility),
      inverse_hostility_stddev: standardDeviation(metrics.inverseHostility),
      amplification_mean: mean(metrics.amplification),
      amplification_stddev: standardDeviation(metrics.amplification),
    });
  }

  return baselines;
}

export function computeCoverageAndConsensusFeatures(
  entry,
  evidenceItems = [],
  baselines = new Map()
) {
  const sourceGroups = new Map();
  for (const evidence of evidenceItems) {
    const sourceMeta = resolveSourceMeta({
      url: evidence?.url,
      hint: evidence?.source_name || evidence?.source_id,
      fallbackName: evidence?.source_name || evidence?.source_id,
    });
    if (sourceMeta.use_in_consensus === false) continue;
    const sourceId = sourceMeta.source_id;
    if (!sourceGroups.has(sourceId)) {
      sourceGroups.set(sourceId, {
        sourceMeta,
        items: [],
        directMatches: 0,
      });
    }
    const group = sourceGroups.get(sourceId);
    group.items.push(evidence);
    if (evidence?.is_direct_entity_match) group.directMatches += 1;
  }

  const uniqueSources = new Map();
  let directCount = 0;
  let mainstreamWeight = 0;
  let socialWeight = 0;
  let totalWeight = 0;
  const policySignals = [];
  const hostilitySignals = [];
  const amplificationSignals = [];

  for (const { sourceMeta, directMatches } of sourceGroups.values()) {
    const weight = clamp(
      (sourceMeta.visibility_weight ?? 0.5) * (sourceMeta.consensus_weight_cap ?? 0.5),
      0.05,
      1
    );
    uniqueSources.set(
      sourceMeta.source_id,
      (uniqueSources.get(sourceMeta.source_id) ?? 0) + weight
    );
    totalWeight += weight;

    if (directMatches > 0) directCount += 1;
    if (["mainstream", "public_broadcaster"].includes(sourceMeta.source_type)) {
      mainstreamWeight += weight;
    }
    if (["social", "forum"].includes(sourceMeta.source_type)) {
      socialWeight += weight;
    }

    const baseline = baselines.get(sourceMeta.source_id) ?? {
      policy_mean: 0,
      policy_stddev: 0.35,
      inverse_hostility_mean: 0.5,
      inverse_hostility_stddev: 0.25,
      amplification_mean: 0.5,
      amplification_stddev: 0.25,
    };

    if (Number.isFinite(entry?.policy_approval)) {
      policySignals.push(
        zScore(entry.policy_approval, baseline.policy_mean, baseline.policy_stddev) * weight
      );
    }
    if (Number.isFinite(entry?.hostility_level)) {
      hostilitySignals.push(
        zScore(
          1 - entry.hostility_level,
          baseline.inverse_hostility_mean,
          baseline.inverse_hostility_stddev
        ) * weight
      );
    }
    if (Number.isFinite(entry?.media_amplification)) {
      amplificationSignals.push(
        zScore(
          entry.media_amplification,
          baseline.amplification_mean,
          baseline.amplification_stddev
        ) * weight
      );
    }
  }

  const evidenceCount = evidenceItems.length;
  const sourceDiversity = sourceGroups.size;
  const signalStrength = clamp(
    evidenceCount / 8 + (Number.isFinite(entry?.media_volume) ? entry.media_volume / 20 : 0),
    0,
    1
  );
  const coverageConfidence = clamp(
    signalStrength * 0.55 +
      clamp(sourceDiversity / 5, 0, 1) * 0.25 +
      clamp(directCount / Math.max(sourceDiversity, 1), 0, 1) * 0.2,
    0,
    1
  );
  const sourceEntropy = computeNormalizedEntropy(Object.fromEntries(uniqueSources));

  const aggregate = (values) => {
    if (!values.length || totalWeight <= 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / totalWeight;
  };

  const policyRelZ = aggregate(policySignals);
  const inverseHostilityRelZ = aggregate(hostilitySignals);
  const amplificationWeighted = clamp(
    (Number.isFinite(entry?.media_amplification) ? entry.media_amplification : 0) *
      (totalWeight / Math.max(sourceDiversity, 1)),
    0,
    1
  );

  const centeredSignals = [policyRelZ, inverseHostilityRelZ, aggregate(amplificationSignals)];
  const crossSourceAgreement = clamp(
    1 - standardDeviation(centeredSignals.map((value) => clamp(value, -2, 2))) / 2,
    0,
    1
  );

  return {
    has_direct_coverage: directCount > 0,
    signal_strength: roundTo(signalStrength, 3),
    source_diversity: sourceDiversity,
    coverage_confidence: roundTo(coverageConfidence, 3),
    policy_rel_z: roundTo(policyRelZ, 3),
    inverse_hostility_rel_z: roundTo(inverseHostilityRelZ, 3),
    amplification_weighted: roundTo(amplificationWeighted, 3),
    cross_source_agreement: roundTo(crossSourceAgreement, 3),
    mainstream_share: roundTo(totalWeight > 0 ? mainstreamWeight / totalWeight : 0, 3),
    social_share: roundTo(totalWeight > 0 ? socialWeight / totalWeight : 0, 3),
    source_entropy: roundTo(sourceEntropy, 3),
  };
}
