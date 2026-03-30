import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEY = "politymarket-alert-subscription";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    if (state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

/**
 * Alert subscription state hook with localStorage persistence and API calls.
 */
export default function useAlertState() {
  const [sub, setSub] = useState(loadState);

  useEffect(() => {
    saveState(sub);
  }, [sub]);

  const isSubscribed = useCallback(
    (politicianId) => {
      return sub?.politicianIds?.includes(politicianId) ?? false;
    },
    [sub]
  );

  const hasSubscription = useMemo(() => sub?.email != null, [sub]);

  const subscribe = useCallback(async (email, politicianIds, webhookUrl) => {
    const existingToken = loadState()?.token;
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        politicianIds,
        webhookUrl: webhookUrl || undefined,
        token: existingToken || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Subscribe failed");
    }
    const data = await res.json();
    setSub({
      email,
      token: data.token,
      verified: data.updated ? (loadState()?.verified ?? false) : false,
      politicianIds,
      webhookUrl: webhookUrl || null,
    });
    return data;
  }, []);

  const togglePolitician = useCallback(
    async (politicianId) => {
      // Read latest state to avoid stale closure issues with rapid clicks
      const latest = loadState();
      if (!latest) return;
      const current = latest.politicianIds || [];
      const next = current.includes(politicianId)
        ? current.filter((id) => id !== politicianId)
        : [...current, politicianId];

      // Optimistic update
      setSub((prev) => ({ ...prev, politicianIds: next }));

      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: latest.email,
            politicianIds: next,
            webhookUrl: latest.webhookUrl || undefined,
            token: latest.token,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Toggle subscription failed");
        }
      } catch {
        // Revert on failure
        setSub((prev) => ({ ...prev, politicianIds: current }));
      }
    },
    [] // no dependency on sub — reads latest from localStorage directly
  );

  const unsubscribe = useCallback(async () => {
    if (!sub?.token) return;
    try {
      await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sub.token }),
      });
    } catch {
      // Continue with local cleanup even if API fails
    }
    setSub(null);
  }, [sub]);

  return {
    subscription: sub,
    hasSubscription,
    isSubscribed,
    subscribe,
    togglePolitician,
    unsubscribe,
  };
}
