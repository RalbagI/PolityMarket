import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const STORAGE_KEY = "politymarket-alert-subscription";
const DEFAULT_SYNC_DEBOUNCE_MS = 1000;

function getSyncDebounceMs() {
  if (
    typeof window !== "undefined" &&
    Number.isFinite(window.__POLITYMARKET_ALERT_SYNC_MS__) &&
    window.__POLITYMARKET_ALERT_SYNC_MS__ >= 0
  ) {
    return window.__POLITYMARKET_ALERT_SYNC_MS__;
  }

  if (import.meta.env?.MODE === "test" || import.meta.env?.VITEST) {
    return 0;
  }

  return DEFAULT_SYNC_DEBOUNCE_MS;
}

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
  const lastConfirmedSubRef = useRef(sub);
  const pendingSyncRef = useRef(null);
  const syncTimerRef = useRef(null);
  const syncVersionRef = useRef(0);
  const syncDebounceMs = getSyncDebounceMs();

  const postSubscriptionUpdate = useCallback(async (snapshot, { keepalive = false } = {}) => {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(keepalive ? { keepalive: true } : {}),
      body: JSON.stringify({
        email: snapshot.email,
        politicianIds: snapshot.politicianIds,
        webhookUrl: snapshot.webhookUrl || undefined,
        token: snapshot.token || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Toggle subscription failed");
    }
  }, []);

  const clearSyncTimer = useCallback(() => {
    if (syncTimerRef.current != null) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const flushPendingSync = useCallback(
    async ({ keepalive = false } = {}) => {
      clearSyncTimer();
      while (pendingSyncRef.current) {
        const pending = pendingSyncRef.current;
        pendingSyncRef.current = null;

        try {
          await postSubscriptionUpdate(pending.snapshot, { keepalive });
          if (syncVersionRef.current === pending.version) {
            lastConfirmedSubRef.current = pending.snapshot;
          }
        } catch {
          if (!pendingSyncRef.current && syncVersionRef.current === pending.version) {
            subRef.current = lastConfirmedSubRef.current;
            setSub(lastConfirmedSubRef.current);
          }
          return false;
        }
      }

      return true;
    },
    [clearSyncTimer, postSubscriptionUpdate]
  );

  const queueSubscriptionSync = useCallback(
    async (snapshot) => {
      syncVersionRef.current += 1;
      pendingSyncRef.current = { version: syncVersionRef.current, snapshot };

      if (syncDebounceMs <= 0) {
        return flushPendingSync();
      }

      clearSyncTimer();
      syncTimerRef.current = setTimeout(() => {
        void flushPendingSync();
      }, syncDebounceMs);
      return true;
    },
    [clearSyncTimer, flushPendingSync, syncDebounceMs]
  );

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
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);

    // Set immediate local state, then hydrate with backend values.
    const initialRecovered = {
      email: recoveredEmail,
      token: recoveredToken,
      verified: false,
      politicianIds: [],
      webhookUrl: null,
    };

    let cancelled = false;
    (async () => {
      try {
        subRef.current = initialRecovered;
        lastConfirmedSubRef.current = initialRecovered;
        setSub(initialRecovered);

        const res = await fetch(`/api/subscription?token=${encodeURIComponent(recoveredToken)}`);
        if (!res.ok) return;
        const payload = await res.json();
        if (cancelled) return;

        const hydrated = {
          email: payload.email || recoveredEmail,
          token: recoveredToken,
          verified: payload.verified === true,
          politicianIds: Array.isArray(payload.politicianIds)
            ? payload.politicianIds
            : initialRecovered.politicianIds,
          webhookUrl: payload.webhookUrl ?? null,
        };
        subRef.current = hydrated;
        lastConfirmedSubRef.current = hydrated;
        setSub(hydrated);
      } catch {
        // Keep initial recovery state if hydration fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    subRef.current = sub;
    saveState(sub);
  }, [sub]);

  useEffect(() => {
    function flushOnBackground() {
      if (pendingSyncRef.current) {
        void flushPendingSync({ keepalive: true });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushOnBackground();
      }
    }

    window.addEventListener("pagehide", flushOnBackground);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushOnBackground);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearSyncTimer();
    };
  }, [clearSyncTimer, flushPendingSync]);

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
    lastConfirmedSubRef.current = nextSub;
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

      await queueSubscriptionSync(optimisticSub);
    },
    [queueSubscriptionSync] // no dependency on sub — reads latest from mutable ref
  );

  const unsubscribe = useCallback(async () => {
    if (!sub?.token) return;
    clearSyncTimer();
    pendingSyncRef.current = null;
    try {
      await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sub.token }),
      });
    } catch {
      // Continue with local cleanup even if API fails
    }
    lastConfirmedSubRef.current = null;
    setSub(null);
  }, [clearSyncTimer, sub]);

  return {
    subscription: sub,
    hasSubscription,
    isSubscribed,
    subscribe,
    togglePolitician,
    unsubscribe,
  };
}
