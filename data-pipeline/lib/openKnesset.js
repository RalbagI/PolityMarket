/**
 * OpenKnesset parliamentary data adapter.
 *
 * Legacy API-path behavior is preserved for tests via the injectable _fetchJson
 * argument. Production runtime now falls back to published data-package files
 * because the old api/v2 endpoints are not reliably available.
 */

import retry, { isTransientError } from "./retry.js";

const DEFAULT_BASE_URL = "https://oknesset.org/api/v2/";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_WINDOW_DAYS = 7;
const DATASET_BASE_URL = "https://production.oknesset.org/pipelines/data/members";
const PRESENCE_URL = `${DATASET_BASE_URL}/presence/presence.txt`;
const POSITIONS_URL = `${DATASET_BASE_URL}/mk_individual/mk_individual_positions.csv`;

/** In-memory cache: politicianId → OknessetData | null */
const _cache = new Map();
const _datasetCache = {
  positions: null,
  presenceWindow: null,
};

/**
 * @typedef {Object} OknessetVote
 * @property {string} title
 * @property {"for"|"against"|"abstain"} vote
 * @property {string} date
 */

/**
 * @typedef {Object} OknessetData
 * @property {number|null} attendance_rate
 * @property {number|null} committee_rate
 * @property {number|null} initiative_score
 * @property {OknessetVote[]} voting_record
 * @property {number} mmm_requests_count
 */

export async function fetchParliamentaryData(politicianId, config, _fetchJson) {
  if (_cache.has(politicianId)) return _cache.get(politicianId);

  const timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const windowDays = config?.windowDays ?? DEFAULT_WINDOW_DAYS;
  const memberIdMap = config?.memberIdMap ?? {};
  const oknessetId = Number(memberIdMap[politicianId]);

  if (!oknessetId) {
    _cache.set(politicianId, null);
    return null;
  }

  if (_fetchJson) {
    const result = await fetchViaLegacyApi(oknessetId, config, _fetchJson, timeoutMs, windowDays);
    _cache.set(politicianId, result);
    return result;
  }

  const result = await fetchViaDatasets(oknessetId, timeoutMs, windowDays);
  _cache.set(politicianId, result);
  return result;
}

export function clearCache() {
  _cache.clear();
  _datasetCache.positions = null;
  _datasetCache.presenceWindow = null;
}

async function fetchViaLegacyApi(oknessetId, config, _fetchJson, timeoutMs, windowDays) {
  const baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
  const fetchJson = _fetchJson ?? makeDefaultFetchJson(timeoutMs);

  try {
    const fromDate = getWindowStartDate(windowDays);
    const toDate = new Date().toISOString().split("T")[0];

    const eid = encodeURIComponent(oknessetId);
    const eFrom = encodeURIComponent(fromDate);
    const eTo = encodeURIComponent(toDate);

    const [votesResult, memberResult, mmmResult] = await Promise.allSettled([
      retry(
        () =>
          fetchJson(
            `${baseUrl}vote/?mk_id=${eid}&from_date=${eFrom}&to_date=${eTo}&limit=50`
          ),
        { maxRetries: 2, initialDelay: 500, shouldRetry: isTransientError }
      ),
      retry(() => fetchJson(`${baseUrl}member/${eid}/`), {
        maxRetries: 2,
        initialDelay: 500,
        shouldRetry: isTransientError,
      }),
      retry(
        () => fetchJson(`${baseUrl}mmm/?request_by=${eid}&from_date=${eFrom}&limit=20`),
        { maxRetries: 2, initialDelay: 500, shouldRetry: isTransientError }
      ),
    ]);

    const votes = votesResult.status === "fulfilled" ? (votesResult.value?.objects ?? []) : [];
    const member = memberResult.status === "fulfilled" ? memberResult.value : null;
    const mmm = mmmResult.status === "fulfilled" ? (mmmResult.value?.objects ?? []) : [];

    const totalVotes = votes.length;
    const attendedVotes = votes.filter(
      (v) => v.vote !== "no-show" && v.vote !== "absent" && v.vote != null
    ).length;
    const attendance_rate = totalVotes > 0 ? Math.min(1, attendedVotes / totalVotes) : null;
    const committee_rate =
      memberResult.status === "fulfilled"
        ? computeCommitteeRateFromCount(
            Array.isArray(member?.committee_positions) ? member.committee_positions.length : 0
          )
        : null;

    return {
      attendance_rate,
      committee_rate,
      initiative_score: null,
      voting_record: votes.slice(0, 10).map((v) => ({
        title: String(v.title || v.bill_title || "Unnamed vote").slice(0, 120),
        vote: normalizeVoteDirection(v.vote),
        date: String(v.time || v.date || "").slice(0, 10),
      })),
      mmm_requests_count: mmm.length,
    };
  } catch (err) {
    console.warn(`[OpenKnesset] Legacy API failed for ${oknessetId}: ${err.message}`);
    return null;
  }
}

async function fetchViaDatasets(oknessetId, timeoutMs, windowDays) {
  try {
    const [positions, presenceWindow] = await Promise.all([
      loadPositions(timeoutMs),
      loadPresenceWindow(timeoutMs, windowDays),
    ]);

    const positionRow = positions.get(oknessetId) ?? null;
    const attendanceUnits = presenceWindow.counts.get(oknessetId) ?? 0;
    const attendance_rate =
      presenceWindow.maxCount > 0 ? Math.min(1, attendanceUnits / presenceWindow.maxCount) : null;

    return {
      attendance_rate,
      committee_rate: computeCommitteeRateFromCount(countCommitteePositions(positionRow?.positions)),
      initiative_score: null,
      voting_record: [],
      mmm_requests_count: 0,
    };
  } catch (err) {
    console.warn(`[OpenKnesset] Dataset fallback failed for ${oknessetId}: ${err.message}`);
    return null;
  }
}

async function loadPositions(timeoutMs) {
  if (_datasetCache.positions) return _datasetCache.positions;

  const csv = await retry(() => fetchText(POSITIONS_URL, timeoutMs), {
    maxRetries: 2,
    initialDelay: 1000,
    shouldRetry: isTransientError,
  });
  const rows = parseCsv(csv);
  const positions = new Map();

  for (const row of rows) {
    const mkId = Number(row.mk_individual_id);
    if (!Number.isFinite(mkId)) continue;
    let parsedPositions = [];
    try {
      parsedPositions = JSON.parse(row.positions || "[]");
    } catch {
      parsedPositions = [];
    }
    positions.set(mkId, {
      mk_individual_id: mkId,
      is_current: String(row.IsCurrent).toLowerCase() === "true",
      positions: Array.isArray(parsedPositions) ? parsedPositions : [],
    });
  }

  _datasetCache.positions = positions;
  return positions;
}

async function loadPresenceWindow(timeoutMs, windowDays) {
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `${today}:${windowDays}`;
  if (_datasetCache.presenceWindow?.key === cacheKey) {
    return _datasetCache.presenceWindow;
  }

  const text = await retry(() => fetchText(PRESENCE_URL, timeoutMs), {
    maxRetries: 2,
    initialDelay: 1000,
    shouldRetry: isTransientError,
  });
  const fromDate = getWindowStartDate(windowDays);
  const counts = new Map();

  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const [timestamp, ...rest] = line.split(",");
    const date = String(timestamp ?? "").trim().slice(0, 10);
    if (!date || date < fromDate || date > today) continue;

    const seen = new Set();
    for (const rawId of rest) {
      const mkId = Number.parseInt(String(rawId).trim(), 10);
      if (!Number.isFinite(mkId) || seen.has(mkId)) continue;
      seen.add(mkId);
      counts.set(mkId, (counts.get(mkId) ?? 0) + 1);
    }
  }

  const maxCount = Math.max(0, ...counts.values());
  _datasetCache.presenceWindow = { key: cacheKey, counts, maxCount };
  return _datasetCache.presenceWindow;
}

function countCommitteePositions(positions = []) {
  if (!Array.isArray(positions)) return 0;
  let count = 0;
  for (const position of positions) {
    const committeeId = position?.CommitteeID ?? null;
    const committeeName = String(position?.CommitteeName ?? "");
    if (committeeId != null || committeeName) count += 1;
  }
  return count;
}

function computeCommitteeRateFromCount(count) {
  if (count >= 2) return 0.85;
  if (count >= 1) return 0.7;
  return 0.3;
}

function getWindowStartDate(windowDays) {
  const d = new Date();
  d.setDate(d.getDate() - (Number(windowDays) || 7));
  return d.toISOString().split("T")[0];
}

function normalizeVoteDirection(vote) {
  if (vote == null) return "abstain";
  const v = String(vote).toLowerCase();
  if (v === "for" || v === "yes" || v === "1" || v === "בעד") return "for";
  if (v === "against" || v === "no" || v === "-1" || v === "נגד") return "against";
  return "abstain";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      cell += character;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PolityMarketPipeline/1.0 (+https://github.com/RalbagI/PolityMarket)",
        Accept: "text/plain, text/csv, application/json",
      },
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} for ${url}`);
      err.status = res.status;
      throw err;
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function makeDefaultFetchJson(timeoutMs) {
  return async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "PolityMarketPipeline/1.0 (+https://github.com/RalbagI/PoliticMarket)",
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} for ${url}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  };
}
