const SPAM_PATTERNS_HE = ["מודעה", "פרסומת", "שיתוף פעולה מסחרי", "תוכן ממומן", "הצטרפו לערוץ"];
const SPAM_PATTERNS_EN = ["sponsored", "promoted", "advertisement", "paid partnership", "Join @"];
const SPAM_URL_PATTERNS = ["/sponsored/", "/ad/", "utm_medium=paid", "utm_source=paid"];

const HEBREW_RE = /[\u0590-\u05FF]/;

export function isSpamContent(text, permalink) {
  if (!text || text.length < 15) return true;
  const lower = text.toLowerCase();
  for (const p of SPAM_PATTERNS_EN) {
    if (lower.includes(p.toLowerCase())) return true;
  }
  for (const p of SPAM_PATTERNS_HE) {
    if (text.includes(p)) return true;
  }
  if (permalink) {
    for (const p of SPAM_URL_PATTERNS) {
      if (permalink.includes(p)) return true;
    }
  }
  // Pure URL with no text content
  if (/^https?:\/\/\S+$/.test(text.trim())) return true;
  return false;
}

export function validateChainOfThought(entries) {
  const warnings = [];
  for (const entry of entries) {
    const cot = entry.chain_of_thought;
    // null CoT is flagged by validateCoTCoverage at the aggregate level
    if (cot == null) continue;
    if (cot.length < 20) {
      warnings.push(`[CoT] ${entry.name}: chain_of_thought too short (${cot.length} chars)`);
    } else if (!HEBREW_RE.test(cot)) {
      warnings.push(`[CoT] ${entry.name}: chain_of_thought contains no Hebrew characters`);
    }
  }
  return warnings;
}

export function validateCoTCoverage(entries, minCoverageRatio = 0.8, minCoTLength = 50) {
  const warnings = [];
  if (!entries.length) return warnings;
  const withCoT = entries.filter(
    (e) => e.chain_of_thought && e.chain_of_thought.length >= minCoTLength
  );
  const ratio = withCoT.length / entries.length;
  if (ratio < minCoverageRatio) {
    warnings.push(
      `[CoT Coverage] Only ${withCoT.length}/${entries.length} (${(ratio * 100).toFixed(0)}%) have meaningful CoT (>=${minCoTLength} chars) — expected >=${(minCoverageRatio * 100).toFixed(0)}%`
    );
  }
  return warnings;
}

export function validateTemporalConsistency(entries, historicalSummary) {
  const warnings = [];
  if (!historicalSummary.length) return warnings;

  // Pre-build O(1) lookup by politician_id
  const historyMap = new Map();
  for (const h of historicalSummary) {
    if (!historyMap.has(h.politician_id)) historyMap.set(h.politician_id, []);
    historyMap.get(h.politician_id).push(h.overall_score);
  }

  for (const entry of entries) {
    const history = historyMap.get(entry.politician_id) || [];

    if (history.length < 3) continue;

    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const stddev = Math.sqrt(history.reduce((sum, v) => sum + (v - mean) ** 2, 0) / history.length);
    const threshold = Math.max(stddev * 3, 1.5); // minimum 1.5 point change
    const delta = Math.abs(entry.overall_score - mean);

    if (delta > threshold) {
      warnings.push(
        `[Temporal] ${entry.name}: score ${entry.overall_score.toFixed(1)} deviates ${delta.toFixed(1)} from 7-day avg ${mean.toFixed(1)} (threshold: ${threshold.toFixed(1)})`
      );
    }
  }
  return warnings;
}

export function detectOutliers(entries) {
  const warnings = [];
  const scores = entries.map((e) => e.overall_score).sort((a, b) => a - b);
  if (scores.length < 5) return warnings;

  const q1 = scores[Math.floor(scores.length * 0.25)];
  const q3 = scores[Math.floor(scores.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  for (const entry of entries) {
    if (entry.overall_score < lowerBound || entry.overall_score > upperBound) {
      warnings.push(
        `[Outlier] ${entry.name}: score ${entry.overall_score.toFixed(1)} outside IQR bounds [${lowerBound.toFixed(1)}, ${upperBound.toFixed(1)}]`
      );
    }
  }
  return warnings;
}

export function validatePartyConsistency(partyEntries) {
  const warnings = [];
  for (const party of partyEntries) {
    if (party.member_count >= 3 && party.score_stddev === 0) {
      warnings.push(
        `[Party] ${party.party}: all ${party.member_count} members have identical scores — possible hallucination`
      );
    }
  }
  return warnings;
}

/**
 * Check that at least 80% of politicians have non-null dim_public_sentiment
 * and optionally dim_parliamentary_activity in the latest detail file.
 * Returns an array of warning strings (empty = all good).
 *
 * @param {Object[]} entries - Processed daily entries
 * @param {Object} [options]
 * @param {boolean} [options.requireParliamentaryActivity=true]
 * @param {number} [options.threshold=0.8]
 * @returns {string[]}
 */
export function validateDimensionConsistency(entries, options = {}) {
  const warnings = [];
  if (!entries.length) return warnings;

  const THRESHOLD = Number.isFinite(options.threshold) ? options.threshold : 0.8;
  const requireParliamentaryActivity = options.requireParliamentaryActivity ?? true;
  const REQUIRED_DIMS = requireParliamentaryActivity
    ? ["dim_public_sentiment", "dim_parliamentary_activity"]
    : ["dim_public_sentiment"];

  for (const dim of REQUIRED_DIMS) {
    const nonNull = entries.filter((e) => e[dim] != null && Number.isFinite(e[dim])).length;
    const ratio = nonNull / entries.length;
    if (ratio < THRESHOLD) {
      warnings.push(
        `[DimConsistency] ${dim}: only ${nonNull}/${entries.length} (${(ratio * 100).toFixed(0)}%) entries have non-null values — expected ≥80%`
      );
    }
  }
  return warnings;
}

export function aggregateParties(entries, today) {
  const partyMap = new Map();

  for (const entry of entries) {
    if (!partyMap.has(entry.party)) {
      partyMap.set(entry.party, []);
    }
    partyMap.get(entry.party).push(entry);
  }

  return [...partyMap.entries()].map(([party, members]) => {
    const totalVolume = members.reduce((s, m) => s + m.media_volume, 0);
    const weightedScore =
      totalVolume > 0
        ? members.reduce((s, m) => s + m.overall_score * m.media_volume, 0) / totalVolume
        : members.reduce((s, m) => s + m.overall_score, 0) / members.length;

    const scores = members.map((m) => m.overall_score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stddev = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length);

    const topMember = members.reduce((best, m) =>
      m.media_volume > (best.media_volume ?? 0) ? m : best
    );

    return {
      date: today,
      party,
      wing: members[0].wing,
      member_count: members.length,
      overall_score: parseFloat(weightedScore.toFixed(1)),
      media_volume: parseFloat(totalVolume.toFixed(1)),
      media_climate_raw: parseFloat(weightedScore.toFixed(1)),
      hostility_avg: parseFloat(
        (members.reduce((s, m) => s + m.hostility_level, 0) / members.length).toFixed(2)
      ),
      policy_avg: parseFloat(
        (members.reduce((s, m) => s + m.policy_approval, 0) / members.length).toFixed(2)
      ),
      amplification_avg: parseFloat(
        (members.reduce((s, m) => s + m.media_amplification, 0) / members.length).toFixed(2)
      ),
      top_politician: topMember.politician_id,
      score_stddev: parseFloat(stddev.toFixed(2)),
      has_direct_coverage: members.some((member) => member.has_direct_coverage),
      signal_strength: parseFloat(
        (
          members.reduce((sum, member) => sum + (member.signal_strength ?? 0), 0) / members.length
        ).toFixed(3)
      ),
      source_diversity: [...new Set(members.flatMap((member) => member.evidence_items ?? []).map((e) => e.source_id))]
        .length,
      coverage_confidence: parseFloat(
        (
          members.reduce((sum, member) => sum + (member.coverage_confidence ?? 0), 0) /
          members.length
        ).toFixed(3)
      ),
      policy_rel_z: parseFloat(
        (members.reduce((sum, member) => sum + (member.policy_rel_z ?? 0), 0) / members.length).toFixed(
          3
        )
      ),
      inverse_hostility_rel_z: parseFloat(
        (
          members.reduce((sum, member) => sum + (member.inverse_hostility_rel_z ?? 0), 0) /
          members.length
        ).toFixed(3)
      ),
      amplification_weighted: parseFloat(
        (
          members.reduce((sum, member) => sum + (member.amplification_weighted ?? 0), 0) /
          members.length
        ).toFixed(3)
      ),
      cross_source_agreement: parseFloat(
        (
          members.reduce((sum, member) => sum + (member.cross_source_agreement ?? 0), 0) /
          members.length
        ).toFixed(3)
      ),
      mainstream_share: parseFloat(
        (
          members.reduce((sum, member) => sum + (member.mainstream_share ?? 0), 0) / members.length
        ).toFixed(3)
      ),
      social_share: parseFloat(
        (
          members.reduce((sum, member) => sum + (member.social_share ?? 0), 0) / members.length
        ).toFixed(3)
      ),
      source_entropy: parseFloat(
        (
          members.reduce((sum, member) => sum + (member.source_entropy ?? 0), 0) / members.length
        ).toFixed(3)
      ),
    };
  });
}
