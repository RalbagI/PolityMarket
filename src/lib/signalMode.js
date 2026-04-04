export const SIGNAL_MODE_MEDIA_CLIMATE = "media_climate";
export const SIGNAL_MODE_CONSENSUS_PROXY = "consensus_proxy";

export const SIGNAL_MODE_OPTIONS = Object.freeze([
  SIGNAL_MODE_MEDIA_CLIMATE,
  SIGNAL_MODE_CONSENSUS_PROXY,
]);

function toFiniteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

export function resolveMediaClimateRaw(entry) {
  return toFiniteNumber(entry?.media_climate_raw) ?? toFiniteNumber(entry?.overall_score);
}

export function resolveMediaClimateDisplay(entry) {
  return (
    toFiniteNumber(entry?.media_climate_display) ??
    toFiniteNumber(entry?.market_score) ??
    (Number.isFinite(entry?.overall_score) ? Math.round(entry.overall_score * 10) : null)
  );
}

export function resolveConsensusDisplay(entry) {
  return toFiniteNumber(entry?.consensus_proxy);
}

export function hasConsensusSignal(entry) {
  return Number.isFinite(resolveConsensusDisplay(entry));
}

export function hasConsensusInRows(rows = [], date = null) {
  return rows.some((entry) => {
    if (date && entry?.date !== date) return false;
    return hasConsensusSignal(entry);
  });
}

export function resolveSignalDisplayScore(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  if (mode === SIGNAL_MODE_CONSENSUS_PROXY) {
    return resolveConsensusDisplay(entry);
  }
  return resolveMediaClimateDisplay(entry);
}

export function resolveSignalRawScore(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  if (mode === SIGNAL_MODE_CONSENSUS_PROXY) {
    return resolveConsensusDisplay(entry);
  }
  return resolveMediaClimateRaw(entry) ?? resolveMediaClimateDisplay(entry);
}

export function resolveSignalDelta(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  if (mode === SIGNAL_MODE_CONSENSUS_PROXY) return null;
  return toFiniteNumber(entry?.market_delta_points);
}

export function resolveSignalDeltaPct(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  if (mode === SIGNAL_MODE_CONSENSUS_PROXY) return null;
  return toFiniteNumber(entry?.market_delta_pct);
}

export function resolveSignalTier(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  if (mode === SIGNAL_MODE_CONSENSUS_PROXY) return null;
  return entry?.market_tier ?? null;
}

export function resolveSignalPercentile(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  if (mode === SIGNAL_MODE_CONSENSUS_PROXY) return null;
  return toFiniteNumber(entry?.market_percentile);
}

export function resolveSignalConfidence(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  if (mode === SIGNAL_MODE_CONSENSUS_PROXY) {
    return toFiniteNumber(entry?.consensus_confidence);
  }
  return toFiniteNumber(entry?.coverage_confidence);
}

export function resolveSignalConfidenceBand(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  if (mode !== SIGNAL_MODE_CONSENSUS_PROXY) return null;
  const low = toFiniteNumber(entry?.consensus_ci_low);
  const high = toFiniteNumber(entry?.consensus_ci_high);
  if (low == null || high == null) return null;
  return { low, high };
}

export function resolveSignalSource(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  if (mode === SIGNAL_MODE_CONSENSUS_PROXY) {
    return entry?.consensus_signal_source ?? null;
  }
  return entry?.has_direct_coverage ? "direct_coverage" : "sparse_coverage";
}

export function isLowConfidenceSignal(entry, mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  const confidence = resolveSignalConfidence(entry, mode);
  if (mode === SIGNAL_MODE_CONSENSUS_PROXY) {
    return (
      !Number.isFinite(entry?.consensus_proxy) ||
      entry?.consensus_signal_source === "media_only" ||
      entry?.has_direct_coverage === false ||
      (confidence != null && confidence < 0.55)
    );
  }
  return (
    entry?.has_direct_coverage === false ||
    (confidence != null && confidence < 0.45) ||
    !Number.isFinite(resolveMediaClimateDisplay(entry))
  );
}

export function getSignalLabelKey(mode = SIGNAL_MODE_MEDIA_CLIMATE) {
  return mode === SIGNAL_MODE_CONSENSUS_PROXY ? "signals.consensusProxy" : "signals.mediaClimate";
}
