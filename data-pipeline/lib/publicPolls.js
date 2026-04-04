import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_POLL_PATH = path.join(__dirname, "..", "data", "public_polls.json");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function loadPublicPolls(filePath = DEFAULT_POLL_PATH) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (poll) =>
          poll &&
          typeof poll.entity_type === "string" &&
          typeof poll.entity_id === "string" &&
          typeof poll.date === "string" &&
          Number.isFinite(poll.value)
      )
      .map((poll) => ({
        ...poll,
        value: clamp(poll.value, 0, 100),
      }));
  } catch {
    return [];
  }
}

export function getPublicPollAdapter(filePath = DEFAULT_POLL_PATH) {
  const polls = loadPublicPolls(filePath);
  return {
    filePath,
    polls,
    buildLookup() {
      const lookup = new Map();
      for (const poll of polls) {
        const key = `${poll.entity_type}:${poll.entity_id}`;
        if (!lookup.has(key)) lookup.set(key, []);
        lookup.get(key).push(poll);
      }
      for (const rows of lookup.values()) {
        rows.sort((a, b) => a.date.localeCompare(b.date));
      }
      return lookup;
    },
  };
}
