function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toDateNumber(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86400000;
}

function diffDays(a, b) {
  const left = toDateNumber(a);
  const right = toDateNumber(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return left - right;
}

function lookupMostRecentPoll(pollLookup, entityKey, date, maxAgeDays = 21) {
  const rows = pollLookup.get(entityKey) ?? [];
  let best = null;
  for (const row of rows) {
    if (row.date > date) continue;
    const ageDays = diffDays(date, row.date);
    if (!Number.isFinite(ageDays) || ageDays < 0 || ageDays > maxAgeDays) continue;
    if (!best || row.date > best.date) best = { ...row, age_days: ageDays };
  }
  return best;
}

function normalizeCount(value, maxValue) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 0;
  return clamp(value / maxValue, 0, 1);
}

const DEFAULT_MEDIA_COEFFICIENTS = Object.freeze([50, 9, 7, 16, 14, 10, -6, 4, 4]);

function inferSourceLabel({ hasDirectPoll, hasPartyPoll }) {
  if (hasDirectPoll) return "direct_poll";
  if (hasPartyPoll) return "party_poll+media";
  return "media_only";
}

function buildMediaFeatureVector(row) {
  const signalStrength = clamp(row?.signal_strength ?? 0, 0, 1);
  const sourceDiversity = normalizeCount(row?.source_diversity ?? 0, 6);
  const policySignal = Number.isFinite(row?.policy_rel_z)
    ? clamp(row.policy_rel_z, -2.5, 2.5)
    : clamp(row?.policy_approval ?? 0, -1, 1);
  const hostilitySignal = Number.isFinite(row?.inverse_hostility_rel_z)
    ? clamp(row.inverse_hostility_rel_z, -2.5, 2.5)
    : clamp(1 - 2 * (row?.hostility_level ?? 0.5), -1, 1);
  const amplificationSignal = Number.isFinite(row?.amplification_weighted)
    ? clamp(row.amplification_weighted, 0, 1)
    : clamp(row?.media_amplification ?? 0, 0, 1);
  const agreementSignal = clamp(row?.cross_source_agreement ?? 0.5, 0, 1);
  const mainstreamShare = clamp(row?.mainstream_share ?? 0.5, 0, 1);
  const socialShare = clamp(row?.social_share ?? 0, 0, 1);

  return [
    1,
    policySignal,
    hostilitySignal,
    amplificationSignal - 0.5,
    agreementSignal - 0.5,
    mainstreamShare - 0.5,
    socialShare,
    signalStrength,
    sourceDiversity,
  ];
}

function dot(left, right) {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    total += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return total;
}

function solveLinearSystem(matrix, vector) {
  const size = matrix.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(a[row][pivot]) > Math.abs(a[maxRow][pivot])) maxRow = row;
    }
    if (Math.abs(a[maxRow][pivot]) < 1e-8) return null;
    [a[pivot], a[maxRow]] = [a[maxRow], a[pivot]];

    const pivotValue = a[pivot][pivot];
    for (let col = pivot; col <= size; col += 1) {
      a[pivot][col] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = a[row][pivot];
      for (let col = pivot; col <= size; col += 1) {
        a[row][col] -= factor * a[pivot][col];
      }
    }
  }

  return a.map((row) => row[size]);
}

function fitRidgeRegression(samples, lambda = 2) {
  if (!samples.length) return null;
  const featureCount = samples[0].features.length;
  const xtx = Array.from({ length: featureCount }, () => Array(featureCount).fill(0));
  const xty = Array(featureCount).fill(0);

  for (const sample of samples) {
    for (let i = 0; i < featureCount; i += 1) {
      xty[i] += sample.features[i] * sample.target;
      for (let j = 0; j < featureCount; j += 1) {
        xtx[i][j] += sample.features[i] * sample.features[j];
      }
    }
  }

  for (let i = 0; i < featureCount; i += 1) {
    xtx[i][i] += i === 0 ? lambda * 0.25 : lambda;
  }

  return solveLinearSystem(xtx, xty);
}

function summarizeVariance(values) {
  if (values.length <= 1) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / Math.max(values.length, 1);
  return Math.sqrt(variance);
}

function combineObservations(observations) {
  if (!observations.length) return { value: 50, variance: 64 };
  const valid = observations.filter(
    (observation) => Number.isFinite(observation?.value) && Number.isFinite(observation?.variance)
  );
  if (!valid.length) return { value: 50, variance: 64 };

  const precisionSum = valid.reduce((sum, observation) => sum + 1 / observation.variance, 0);
  const weightedValue =
    valid.reduce((sum, observation) => sum + observation.value / observation.variance, 0) /
    precisionSum;
  const disagreementPenalty = summarizeVariance(valid.map((observation) => observation.value)) * 0.35;

  return {
    value: clamp(weightedValue, 0, 100),
    variance: clamp(1 / precisionSum + disagreementPenalty, 6, 120),
  };
}

export function buildPublicPollLookup(polls = []) {
  const map = new Map();
  for (const poll of polls) {
    const entityType = poll?.entity_type;
    const entityId = poll?.entity_id;
    const value = poll?.value;
    const date = poll?.date;
    if (!entityType || !entityId || !Number.isFinite(value) || typeof date !== "string") continue;
    const key = `${entityType}:${entityId}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      ...poll,
      value: clamp(value, 0, 100),
    });
  }
  for (const rows of map.values()) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
  }
  return map;
}

export function buildConsensusCalibrator(
  rows,
  pollLookup = new Map(),
  { entityType = "politician", minSamples = 12 } = {}
) {
  const samples = [];

  for (const row of rows) {
    const directPoll =
      entityType === "party"
        ? lookupMostRecentPoll(pollLookup, `party:${row.party}`, row.date)
        : lookupMostRecentPoll(pollLookup, `politician:${row.politician_id}`, row.date);
    const partyPoll =
      entityType === "party"
        ? null
        : lookupMostRecentPoll(pollLookup, `party:${row.party}`, row.date);
    const target = directPoll?.value ?? partyPoll?.value ?? null;
    if (!Number.isFinite(target)) continue;
    samples.push({
      features: buildMediaFeatureVector(row),
      target,
    });
  }

  if (samples.length < minSamples) {
    return {
      sampleCount: samples.length,
      coefficients: [...DEFAULT_MEDIA_COEFFICIENTS],
      fitted: false,
    };
  }

  const coefficients = fitRidgeRegression(samples);
  if (!coefficients || coefficients.some((value) => !Number.isFinite(value))) {
    return {
      sampleCount: samples.length,
      coefficients: [...DEFAULT_MEDIA_COEFFICIENTS],
      fitted: false,
    };
  }

  return {
    sampleCount: samples.length,
    coefficients,
    fitted: true,
  };
}

export function estimateConsensusObservation(
  row,
  {
    partyPrior = null,
    directPoll = null,
    partyPoll = null,
    calibration = null,
  } = {}
) {
  const signalStrength = clamp(row?.signal_strength ?? 0, 0, 1);
  const sourceDiversity = normalizeCount(row?.source_diversity ?? 0, 6);
  const agreementSignal = clamp(row?.cross_source_agreement ?? 0.5, 0, 1);
  const features = buildMediaFeatureVector(row);
  const coefficients = calibration?.coefficients ?? DEFAULT_MEDIA_COEFFICIENTS;
  const mediaProjection = clamp(dot(coefficients, features), 0, 100);

  const hasDirectPoll = Number.isFinite(directPoll?.value);
  const hasPartyPoll = Number.isFinite(partyPoll?.value);
  const pollAgePenalty = hasDirectPoll
    ? clamp((directPoll.age_days ?? 0) / 21, 0, 1)
    : hasPartyPoll
      ? clamp((partyPoll.age_days ?? 0) / 21, 0, 1)
      : 1;

  const mediaVariance =
    44 +
    (1 - signalStrength) * 24 +
    (1 - sourceDiversity) * 10 +
    (1 - agreementSignal) * 10;

  const observations = [
    {
      value: mediaProjection,
      variance: clamp(mediaVariance, 16, 120),
    },
  ];

  if (Number.isFinite(partyPrior)) {
    observations.push({
      value: partyPrior,
      variance: clamp(28 + (1 - signalStrength) * 12, 14, 80),
    });
  }

  if (hasDirectPoll) {
    observations.push({
      value: directPoll.value,
      variance: clamp(12 + pollAgePenalty * 6, 8, 30),
    });
  } else if (hasPartyPoll) {
    observations.push({
      value: partyPoll.value,
      variance: clamp(18 + pollAgePenalty * 8, 10, 42),
    });
  }

  const combined = combineObservations(observations);

  const source = inferSourceLabel({ hasDirectPoll, hasPartyPoll });
  const variance = combined.variance + pollAgePenalty * 4;

  const confidence = clamp(
    1 -
      (variance - 18) / 70 +
      signalStrength * 0.12 +
      sourceDiversity * 0.08 +
      (hasDirectPoll ? 0.12 : 0),
    0.12,
    0.96
  );

  return {
    observation: combined.value,
    variance,
    confidence,
    signal_source: source,
    media_projection: mediaProjection,
  };
}

function annotateSeries(rows, getEntityPrior) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const grouped = new Map();
  for (const row of rows) {
    const key = row._consensus_entity_key;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ ...row });
  }

  const output = [];
  for (const entityRows of grouped.values()) {
    const sorted = entityRows.slice().sort((a, b) => a.date.localeCompare(b.date));
    let state = 50;
    let covariance = 64;

    for (const row of sorted) {
      const prior = getEntityPrior(row);
      const priorMean = Number.isFinite(prior)
        ? clamp(state * 0.72 + prior * 0.28, 0, 100)
        : state;
      const processNoise = 9;
      let predictedState = priorMean;
      let predictedCovariance = covariance + processNoise;

      if (Number.isFinite(row._consensus_observation)) {
        const variance = clamp(row._consensus_variance ?? 36, 8, 120);
        const gain = predictedCovariance / (predictedCovariance + variance);
        predictedState =
          predictedState + gain * (row._consensus_observation - predictedState);
        predictedCovariance = (1 - gain) * predictedCovariance;
      }

      state = clamp(predictedState, 0, 100);
      covariance = clamp(predictedCovariance, 6, 144);
      const sigma = Math.sqrt(covariance);

      output.push({
        ...row,
        consensus_proxy: roundTo(state, 1),
        consensus_ci_low: roundTo(clamp(state - sigma * 1.96, 0, 100), 1),
        consensus_ci_high: roundTo(clamp(state + sigma * 1.96, 0, 100), 1),
        consensus_confidence: roundTo(clamp(row._consensus_confidence ?? 0.35, 0, 1), 2),
        consensus_signal_source: row._consensus_signal_source ?? "media_only",
      });
    }
  }

  return output
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => {
      const {
        _consensus_entity_key,
        _consensus_observation,
        _consensus_variance,
        _consensus_confidence,
        _consensus_signal_source,
        _consensus_media_projection,
        ...rest
      } = row;
      return rest;
    });
}

export function annotatePartyConsensusTimeline(rows, pollLookup = new Map(), calibration = null) {
  const prepared = rows.map((row) => {
    const directPoll = lookupMostRecentPoll(pollLookup, `party:${row.party}`, row.date);
    const observation = estimateConsensusObservation(row, { directPoll, calibration });
    return {
      ...row,
      _consensus_entity_key: `party:${row.party}`,
      _consensus_observation: observation.observation,
      _consensus_variance: observation.variance,
      _consensus_confidence: observation.confidence,
      _consensus_signal_source: observation.signal_source,
      _consensus_media_projection: observation.media_projection,
    };
  });

  return annotateSeries(prepared, () => null);
}

export function annotatePoliticianConsensusTimeline(
  rows,
  { partyTimeline = [], pollLookup = new Map(), calibration = null } = {}
) {
  const partyByDate = new Map(
    partyTimeline.map((row) => [`${row.date}::${row.party}`, row.consensus_proxy])
  );

  const prepared = rows.map((row) => {
    const partyPrior = partyByDate.get(`${row.date}::${row.party}`) ?? null;
    const directPoll = lookupMostRecentPoll(pollLookup, `politician:${row.politician_id}`, row.date);
    const partyPoll = lookupMostRecentPoll(pollLookup, `party:${row.party}`, row.date);
    const observation = estimateConsensusObservation(row, {
      partyPrior,
      directPoll,
      partyPoll,
      calibration,
    });

    return {
      ...row,
      _consensus_entity_key: `politician:${row.politician_id}`,
      _consensus_observation: observation.observation,
      _consensus_variance: observation.variance,
      _consensus_confidence: observation.confidence,
      _consensus_signal_source: observation.signal_source,
      _consensus_media_projection: observation.media_projection,
    };
  });

  return annotateSeries(prepared, (row) => partyByDate.get(`${row.date}::${row.party}`) ?? null);
}
