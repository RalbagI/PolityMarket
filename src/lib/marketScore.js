import { MARKET_NEUTRAL_RAW_SCORE } from "../../data-pipeline/lib/computeScore.js";

export const MARKET_WINDOW_DAYS = 7;
export const MARKET_SCORE_PRECISION = 1;
export const MARKET_DELTA_PRECISION = 1;
export const MARKET_PERCENTILE_PRECISION = 0;
export const MARKET_PERCENT_DELTA_MIN_BASE = 40;

export const MARKET_TIER_CONFIG = Object.freeze({
  S: { min: 85, label: "Consensus / Peak Momentum" },
  A: { min: 65, label: "Positive Trend" },
  B: { min: 35, label: "Average / Noise" },
  C: { min: 0, label: "Hostile / Crashing" },
});

const MARKET_TIER_BADGE_CLASSES = Object.freeze({
  S: "border-teal-400/40 bg-teal-400/15 text-teal-100",
  A: "border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
  B: "border-amber-300/45 bg-amber-300/15 text-amber-100",
  C: "border-rose-400/40 bg-rose-400/15 text-rose-100",
});

function roundTo(value, digits) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function quantileSorted(sortedValues, percentile) {
  if (!sortedValues.length) return null;

  const index = (sortedValues.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) return sortedValues[lowerIndex];

  const fraction = index - lowerIndex;
  return (
    sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * fraction
  );
}

export function getMarketTier(score) {
  if (!Number.isFinite(score)) return null;
  if (score >= MARKET_TIER_CONFIG.S.min) return "S";
  if (score >= MARKET_TIER_CONFIG.A.min) return "A";
  if (score >= MARKET_TIER_CONFIG.B.min) return "B";
  return "C";
}

export function getMarketTierLabel(tier) {
  return MARKET_TIER_CONFIG[tier]?.label ?? "";
}

export function getMarketTierBadgeClass(tier) {
  return MARKET_TIER_BADGE_CLASSES[tier] ?? "border-white/10 bg-white/5 text-gray-200";
}

export function resolveDisplayScore(entry) {
  if (Number.isFinite(entry?.market_score)) return Math.round(entry.market_score);
  if (Number.isFinite(entry?.overall_score)) return Math.round(entry.overall_score * 10);
  return null;
}

export function getRollingMarketBounds(scores, neutralRaw = MARKET_NEUTRAL_RAW_SCORE) {
  const sortedScores = scores.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sortedScores.length) {
    return { low: neutralRaw - 1, high: neutralRaw + 1, neutralRaw };
  }

  const min = sortedScores[0];
  const max = sortedScores[sortedScores.length - 1];
  const p5 = quantileSorted(sortedScores, 0.05);
  const p95 = quantileSorted(sortedScores, 0.95);

  return {
    low: p5 >= neutralRaw ? min : p5,
    high: p95 <= neutralRaw ? max : p95,
    neutralRaw,
  };
}

export function computeMarketScore(rawScore, bounds, neutralRaw = MARKET_NEUTRAL_RAW_SCORE) {
  if (!Number.isFinite(rawScore)) return null;

  const resolvedNeutral = Number.isFinite(bounds?.neutralRaw) ? bounds.neutralRaw : neutralRaw;
  const low = Number.isFinite(bounds?.low) ? bounds.low : resolvedNeutral - 1;
  const high = Number.isFinite(bounds?.high) ? bounds.high : resolvedNeutral + 1;

  if (rawScore === resolvedNeutral) {
    return roundTo(50, MARKET_SCORE_PRECISION);
  }

  if (rawScore < resolvedNeutral) {
    const denominator = resolvedNeutral - low || 1;
    return roundTo(clamp(((rawScore - low) / denominator) * 50, 0, 50), MARKET_SCORE_PRECISION);
  }

  const denominator = high - resolvedNeutral || 1;
  return roundTo(
    clamp(50 + ((rawScore - resolvedNeutral) / denominator) * 50, 50, 100),
    MARKET_SCORE_PRECISION
  );
}

function getEntityId(row, entityKey) {
  return typeof entityKey === "function" ? entityKey(row) : row?.[entityKey];
}

function toUtcDayNumber(dateString) {
  if (typeof dateString !== "string") return null;
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86400000;
}

function isNextCalendarDay(previousDate, currentDate) {
  const previousDay = toUtcDayNumber(previousDate);
  const currentDay = toUtcDayNumber(currentDate);
  if (!Number.isFinite(previousDay) || !Number.isFinite(currentDay)) return false;
  return currentDay - previousDay === 1;
}

function buildPercentileMap(rowsForDate, entityKey, scoreKey) {
  const validRows = rowsForDate
    .filter((row) => Number.isFinite(row?.[scoreKey]))
    .slice()
    .sort((a, b) => b[scoreKey] - a[scoreKey]);

  const percentileByEntity = new Map();
  if (!validRows.length) return percentileByEntity;
  if (validRows.length === 1) {
    percentileByEntity.set(getEntityId(validRows[0], entityKey), 100);
    return percentileByEntity;
  }

  let index = 0;
  while (index < validRows.length) {
    const score = validRows[index][scoreKey];
    let end = index;
    while (end + 1 < validRows.length && validRows[end + 1][scoreKey] === score) {
      end += 1;
    }

    const startRank = index + 1;
    const endRank = end + 1;
    const averageRank = (startRank + endRank) / 2;
    const percentile = roundTo(
      ((validRows.length - averageRank) / (validRows.length - 1)) * 100,
      MARKET_PERCENTILE_PRECISION
    );

    for (let current = index; current <= end; current += 1) {
      percentileByEntity.set(getEntityId(validRows[current], entityKey), percentile);
    }

    index = end + 1;
  }

  return percentileByEntity;
}

export function annotateMarketTimeline(
  rows,
  {
    entityKey = "politician_id",
    dateKey = "date",
    scoreKey = "overall_score",
    neutralRaw = MARKET_NEUTRAL_RAW_SCORE,
    windowDays = MARKET_WINDOW_DAYS,
  } = {}
) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const rowsByDate = new Map();
  for (const row of rows) {
    const date = row?.[dateKey];
    if (!rowsByDate.has(date)) rowsByDate.set(date, []);
    rowsByDate.get(date).push(row);
  }

  const dates = [...rowsByDate.keys()].sort();
  const metricsByDate = new Map();

  for (let dateIndex = 0; dateIndex < dates.length; dateIndex += 1) {
    const startIndex = Math.max(0, dateIndex - windowDays + 1);
    const windowScores = [];

    for (let cursor = startIndex; cursor <= dateIndex; cursor += 1) {
      const rowsForWindowDate = rowsByDate.get(dates[cursor]) || [];
      for (const row of rowsForWindowDate) {
        if (Number.isFinite(row?.[scoreKey])) {
          windowScores.push(row[scoreKey]);
        }
      }
    }

    metricsByDate.set(dates[dateIndex], {
      bounds: getRollingMarketBounds(windowScores, neutralRaw),
      percentiles: buildPercentileMap(rowsByDate.get(dates[dateIndex]) || [], entityKey, scoreKey),
    });
  }

  const annotatedRows = rows.map((row) => {
    const metrics = metricsByDate.get(row?.[dateKey]);
    const marketScore = computeMarketScore(row?.[scoreKey], metrics?.bounds, neutralRaw);
    return {
      ...row,
      market_score: marketScore,
      market_percentile:
        metrics?.percentiles.get(getEntityId(row, entityKey)) ?? row?.market_percentile ?? null,
      market_tier: getMarketTier(marketScore),
      market_delta_points: null,
      market_delta_pct: null,
    };
  });

  const annotatedByEntity = new Map();
  for (const row of annotatedRows) {
    const entityId = getEntityId(row, entityKey);
    if (!annotatedByEntity.has(entityId)) annotatedByEntity.set(entityId, []);
    annotatedByEntity.get(entityId).push(row);
  }

  const deltaLookup = new Map();
  for (const rowsForEntity of annotatedByEntity.values()) {
    const sortedRows = rowsForEntity.slice().sort((a, b) => a[dateKey].localeCompare(b[dateKey]));
    for (let index = 1; index < sortedRows.length; index += 1) {
      const current = sortedRows[index];
      const previous = sortedRows[index - 1];

      if (!isNextCalendarDay(previous?.[dateKey], current?.[dateKey])) {
        continue;
      }

      if (!Number.isFinite(current.market_score) || !Number.isFinite(previous.market_score)) {
        continue;
      }

      const deltaPoints = roundTo(
        current.market_score - previous.market_score,
        MARKET_DELTA_PRECISION
      );
      const deltaPct =
        previous.market_score >= MARKET_PERCENT_DELTA_MIN_BASE
          ? roundTo((deltaPoints / previous.market_score) * 100, MARKET_DELTA_PRECISION)
          : null;

      deltaLookup.set(`${current[dateKey]}::${getEntityId(current, entityKey)}`, {
        market_delta_points: deltaPoints,
        market_delta_pct: deltaPct,
      });
    }
  }

  return annotatedRows.map((row) => ({
    ...row,
    ...(deltaLookup.get(`${row[dateKey]}::${getEntityId(row, entityKey)}`) || {}),
  }));
}
