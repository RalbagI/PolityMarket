import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEY = "politymarket-filter-prefs";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Filter state hook with localStorage persistence.
 * Manages: active party/wing/sector filters, liked (pinned), hidden (unliked).
 */
export default function useFilterState(allPoliticians) {
  const [prefs, setPrefs] = useState(loadPrefs);

  // Persist on change
  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  // Extract unique values for filter options
  const parties = useMemo(
    () => [...new Set(allPoliticians.map((p) => p.party))].sort(),
    [allPoliticians]
  );
  const wings = useMemo(
    () => [...new Set(allPoliticians.map((p) => p.wing).filter(Boolean))].sort(),
    [allPoliticians]
  );
  const sectors = useMemo(
    () => [...new Set(allPoliticians.map((p) => p.sector).filter(Boolean))].sort(),
    [allPoliticians]
  );

  // Active filters — useMemo to maintain stable references
  const activeParties = useMemo(() => prefs.parties || [], [prefs.parties]);
  const activeWings = useMemo(() => prefs.wings || [], [prefs.wings]);
  const activeSectors = useMemo(() => prefs.sectors || [], [prefs.sectors]);
  const likedIds = useMemo(() => prefs.liked || [], [prefs.liked]);
  const hiddenIds = useMemo(() => prefs.hidden || [], [prefs.hidden]);

  const toggleFilter = useCallback((type, value) => {
    setPrefs((prev) => {
      const arr = prev[type] || [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [type]: next };
    });
  }, []);

  const toggleLiked = useCallback((politicianId) => {
    setPrefs((prev) => {
      const arr = prev.liked || [];
      const next = arr.includes(politicianId)
        ? arr.filter((id) => id !== politicianId)
        : [...arr, politicianId];
      // Remove from hidden if liking
      const hidden = (prev.hidden || []).filter((id) => id !== politicianId);
      return { ...prev, liked: next, hidden };
    });
  }, []);

  const toggleHidden = useCallback((politicianId) => {
    setPrefs((prev) => {
      const arr = prev.hidden || [];
      const next = arr.includes(politicianId)
        ? arr.filter((id) => id !== politicianId)
        : [...arr, politicianId];
      // Remove from liked if hiding
      const liked = (prev.liked || []).filter((id) => id !== politicianId);
      return { ...prev, hidden: next, liked };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setPrefs({});
  }, []);

  // Compute visible politicians
  const visible = useMemo(() => {
    return allPoliticians.filter((p) => {
      const id = p.politician_id || p.name;

      // Always show liked (pinned), even if filters would hide them
      if (likedIds.includes(id)) return true;

      // Never show explicitly hidden
      if (hiddenIds.includes(id)) return false;

      // Apply party filter
      if (activeParties.length && !activeParties.includes(p.party)) return false;

      // Apply wing filter
      if (activeWings.length && p.wing && !activeWings.includes(p.wing)) return false;

      // Apply sector filter
      if (activeSectors.length && p.sector && !activeSectors.includes(p.sector)) return false;

      return true;
    });
  }, [allPoliticians, activeParties, activeWings, activeSectors, likedIds, hiddenIds]);

  return {
    parties,
    wings,
    sectors,
    activeParties,
    activeWings,
    activeSectors,
    likedIds,
    hiddenIds,
    toggleFilter,
    toggleLiked,
    toggleHidden,
    clearFilters,
    visible,
    totalCount: allPoliticians.length,
    visibleCount: visible.length,
  };
}
