import { useCallback, useEffect, useState } from "react";
import { BALANCED_WEIGHTS, DIM_KEYS, normalizeWeights } from "../utils/rescoring";

const STORAGE_KEY = "politymarket-user-weights";

function loadWeights() {
  if (typeof localStorage === "undefined") return { ...BALANCED_WEIGHTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...BALANCED_WEIGHTS };
    const parsed = JSON.parse(raw);
    const out = {};
    for (const key of DIM_KEYS) {
      out[key] = Number.isFinite(parsed?.[key]) ? parsed[key] : BALANCED_WEIGHTS[key];
    }
    return out;
  } catch {
    return { ...BALANCED_WEIGHTS };
  }
}

function saveWeights(weights) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/**
 * Persisted user-dimension weights for the your_score lens. The stored values
 * are the raw (pre-normalized) slider values so the UI can show them 1:1.
 * Callers should use normalizeWeights from rescoring.js before scoring.
 */
export default function useUserWeights() {
  const [weights, setWeights] = useState(loadWeights);

  useEffect(() => {
    saveWeights(weights);
  }, [weights]);

  const setWeight = useCallback((key, value) => {
    if (!DIM_KEYS.includes(key)) return;
    const clean = Number.isFinite(value) && value >= 0 ? value : 0;
    setWeights((prev) => ({ ...prev, [key]: clean }));
  }, []);

  const reset = useCallback(() => {
    setWeights({ ...BALANCED_WEIGHTS });
  }, []);

  const normalized = normalizeWeights(weights);

  return { weights, normalized, setWeight, reset };
}
