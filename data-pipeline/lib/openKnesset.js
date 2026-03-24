/**
 * OpenKnesset API client for structured parliamentary data.
 *
 * Fetches attendance, voting records, committee participation, and MMM
 * research requests for Israeli Knesset members.
 *
 * All errors return null — never throws. Treat as supplemental data.
 * @see https://oknesset.org/api/v2/
 */

import retry, { isTransientError } from "./retry.js";

const DEFAULT_BASE_URL = "https://oknesset.org/api/v2/";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_WINDOW_DAYS = 7;

/** In-memory cache: politicianId → OknessetData | null */
const _cache = new Map();

/**
 * @typedef {Object} OknessetVote
 * @property {string} title
 * @property {"for"|"against"|"abstain"} vote
 * @property {string} date
 */

/**
 * @typedef {Object} OknessetData
 * @property {number|null} attendance_rate    - 0–1, fraction of votes attended
 * @property {number|null} committee_rate     - 0–1, committee participation proxy
 * @property {number|null} initiative_score   - 0–1, private bills filed (normalized, currently null — requires bills API)
 * @property {OknessetVote[]} voting_record   - up to 10 recent votes with titles for LLM context
 * @property {number} mmm_requests_count      - MMM research requests filed in the window
 */

/**
 * Fetch structured parliamentary data for a politician.
 *
 * @param {string} politicianId  - Internal pipeline ID (e.g. "benjamin-netanyahu")
 * @param {Object} config        - from sources.config.json openKnesset section
 * @param {Function} [_fetchJson] - Injectable fetch function for testing
 * @returns {Promise<OknessetData|null>}
 */
export async function fetchParliamentaryData(politicianId, config, _fetchJson) {
  if (_cache.has(politicianId)) return _cache.get(politicianId);

  const baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const windowDays = config?.windowDays ?? DEFAULT_WINDOW_DAYS;
  const memberIdMap = config?.memberIdMap ?? {};
  const oknessetId = memberIdMap[politicianId];

  if (!oknessetId) {
    // No mapping yet — not an error, just skip
    _cache.set(politicianId, null);
    return null;
  }

  const fetchJson = _fetchJson ?? makeDefaultFetchJson(timeoutMs);

  try {
    const fromDate = getWindowStartDate(windowDays);
    const toDate = new Date().toISOString().split("T")[0];

    // Fetch votes, member profile, and MMM requests in parallel
    const [votesResult, memberResult, mmmResult] = await Promise.allSettled([
      retry(
        () =>
          fetchJson(
            `${baseUrl}vote/?mk_id=${oknessetId}&from_date=${fromDate}&to_date=${toDate}&limit=50`
          ),
        { maxRetries: 2, initialDelay: 500, shouldRetry: isTransientError }
      ),
      retry(() => fetchJson(`${baseUrl}member/${oknessetId}/`), {
        maxRetries: 2,
        initialDelay: 500,
        shouldRetry: isTransientError,
      }),
      retry(
        () => fetchJson(`${baseUrl}mmm/?request_by=${oknessetId}&from_date=${fromDate}&limit=20`),
        { maxRetries: 2, initialDelay: 500, shouldRetry: isTransientError }
      ),
    ]);

    const votes = votesResult.status === "fulfilled" ? (votesResult.value?.objects ?? []) : [];
    const member = memberResult.status === "fulfilled" ? memberResult.value : null;
    const mmm = mmmResult.status === "fulfilled" ? (mmmResult.value?.objects ?? []) : [];

    // Attendance rate from voting records
    const totalVotes = votes.length;
    const attendedVotes = votes.filter(
      (v) => v.vote !== "no-show" && v.vote !== "absent" && v.vote != null
    ).length;
    const attendance_rate = totalVotes > 0 ? Math.min(1, attendedVotes / totalVotes) : null;

    // Committee participation proxy from member profile
    const committee_rate = computeCommitteeRate(member);

    // Private bills — requires separate /bill/ API; deferred, returns null
    const initiative_score = null;

    // Voting record for LLM classification context (up to 10 votes)
    const voting_record = votes.slice(0, 10).map((v) => ({
      title: String(v.title || v.bill_title || "Unnamed vote").slice(0, 120),
      vote: normalizeVoteDirection(v.vote),
      date: String(v.time || v.date || "").slice(0, 10),
    }));

    const result = {
      attendance_rate,
      committee_rate,
      initiative_score,
      voting_record,
      mmm_requests_count: mmm.length,
    };

    _cache.set(politicianId, result);
    return result;
  } catch (err) {
    console.warn(
      `[OpenKnesset] Failed for ${politicianId} (oknesset_id=${oknessetId}): ${err.message}`
    );
    _cache.set(politicianId, null);
    return null;
  }
}

/** Clear in-memory cache. Call between pipeline runs and in tests. */
export function clearCache() {
  _cache.clear();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWindowStartDate(windowDays) {
  const d = new Date();
  d.setDate(d.getDate() - (Number(windowDays) || 7));
  return d.toISOString().split("T")[0];
}

function computeCommitteeRate(member) {
  if (!member) return null;
  // Proxy from member profile: committee_positions is an array of roles
  const roles = Array.isArray(member.committee_positions)
    ? member.committee_positions.length
    : member.current_position
      ? 1
      : 0;
  if (roles >= 2) return 0.85;
  if (roles >= 1) return 0.7;
  return 0.3;
}

function normalizeVoteDirection(vote) {
  if (vote == null) return "abstain";
  const v = String(vote).toLowerCase();
  if (v === "for" || v === "yes" || v === "1" || v === "בעד") return "for";
  if (v === "against" || v === "no" || v === "-1" || v === "נגד") return "against";
  return "abstain";
}

function makeDefaultFetchJson(timeoutMs) {
  return async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "PolityMarketPipeline/1.0 (+https://github.com/RalbagI/PolityMarket)",
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
