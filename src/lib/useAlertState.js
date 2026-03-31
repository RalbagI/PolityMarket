import { useState, useEffect, useCallback, useMemo, useRef } from "react";

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
  const subRef = useRef(sub);

  // Recover subscription from URL token (sent via recovery email)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recoveredToken = params.get("recovered_token");
    const recoveredEmail = params.get("recovered_email");
    if (!recoveredToken || !recoveredEmail) return;

    // Clean the URL
    const url = new URL(window.location.href);
    url.searchParams.delete("recovered_token");
    url.searchParams.delete("recovered_email");
    window.history.replaceState({}, "", url.pathname + url.search);

    // Restore subscription state so the user can manage it.
    // verified is not set here — the actual status lives in Firestore.
    const recovered = {
      email: recoveredEmail,
      token: recoveredToken,
      verified: false,
      politicianIds: [],
      webhookUrl: null,
    };
    subRef.current = recovered;
    setSub(recovered);
  }, []);

  useEffect(() => {
    subRef.current = sub;
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
    const existingToken = subRef.current?.token;
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
      const error = new Error(err.error || "Subscribe failed");
      error.code = err.error;
      throw error;
    }
    const data = await res.json();
    const nextSub = {
      email,
      token: data.token,
      verified: data.updated ? (subRef.current?.verified ?? false) : false,
      politicianIds,
      webhookUrl: webhookUrl || null,
    };
    subRef.current = nextSub;
    setSub(nextSub);
    return data;
  }, []);

  const togglePolitician = useCallback(
    async (politicianId) => {
      // Read latest in-memory state to avoid stale closure issues.
      const latest = subRef.current;
      if (!latest) return;
      const current = latest.politicianIds || [];
      const next = current.includes(politicianId)
        ? current.filter((id) => id !== politicianId)
        : [...current, politicianId];

      // Optimistic update
      const optimisticSub = { ...latest, politicianIds: next };
      subRef.current = optimisticSub;
      setSub((prev) => (prev ? { ...prev, politicianIds: next } : optimisticSub));

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
        const revertedSub = { ...latest, politicianIds: current };
        subRef.current = revertedSub;
        setSub((prev) => (prev ? { ...prev, politicianIds: current } : revertedSub));
      }
    },
    [] // no dependency on sub — reads latest from mutable ref
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
