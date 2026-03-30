// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

let useAlertState;

const storage = {};
const localStorageMock = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, val) => {
    storage[key] = String(val);
  },
  removeItem: (key) => {
    delete storage[key];
  },
};

beforeEach(async () => {
  vi.resetModules();
  Object.keys(storage).forEach((k) => delete storage[k]);
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("fetch", vi.fn());
  const mod = await import("./useAlertState.js");
  useAlertState = mod.default;
});

describe("useAlertState — initialization", () => {
  it("starts with null subscription when localStorage is empty", () => {
    const { result } = renderHook(() => useAlertState());
    expect(result.current.subscription).toBeNull();
    expect(result.current.hasSubscription).toBe(false);
  });

  it("loads existing subscription from localStorage", () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      verified: true,
      politicianIds: ["pol-a"],
    });
    const { result } = renderHook(() => useAlertState());
    expect(result.current.subscription.email).toBe("test@example.com");
    expect(result.current.hasSubscription).toBe(true);
  });

  it("handles corrupted localStorage gracefully", () => {
    storage["politymarket-alert-subscription"] = "not-json{{{";
    const { result } = renderHook(() => useAlertState());
    expect(result.current.subscription).toBeNull();
  });
});

describe("useAlertState — isSubscribed", () => {
  it("returns false when no subscription exists", () => {
    const { result } = renderHook(() => useAlertState());
    expect(result.current.isSubscribed("pol-a")).toBe(false);
  });

  it("returns true for subscribed politician", () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: ["pol-a", "pol-b"],
    });
    const { result } = renderHook(() => useAlertState());
    expect(result.current.isSubscribed("pol-a")).toBe(true);
    expect(result.current.isSubscribed("pol-c")).toBe(false);
  });
});

describe("useAlertState — subscribe", () => {
  it("calls API and saves subscription to state + localStorage", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, token: "new-token", updated: false }),
    });

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.subscribe("user@example.com", ["pol-a"], null);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/subscribe",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(result.current.subscription.email).toBe("user@example.com");
    expect(result.current.subscription.token).toBe("new-token");
    expect(result.current.subscription.politicianIds).toEqual(["pol-a"]);

    // Verify localStorage was updated
    const saved = JSON.parse(storage["politymarket-alert-subscription"]);
    expect(saved.email).toBe("user@example.com");
  });

  it("throws on API failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Invalid email" }),
    });

    const { result } = renderHook(() => useAlertState());

    await expect(
      act(async () => {
        await result.current.subscribe("bad", [], null);
      })
    ).rejects.toThrow("Invalid email");
  });
});

describe("useAlertState — togglePolitician", () => {
  it("adds politician to subscription", async () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: ["pol-a"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.togglePolitician("pol-b");
    });

    expect(result.current.subscription.politicianIds).toContain("pol-b");
    expect(result.current.subscription.politicianIds).toContain("pol-a");
  });

  it("removes politician from subscription", async () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: ["pol-a", "pol-b"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.togglePolitician("pol-a");
    });

    expect(result.current.subscription.politicianIds).toEqual(["pol-b"]);
  });

  it("does nothing when no subscription exists", async () => {
    const { result } = renderHook(() => useAlertState());
    await act(async () => {
      await result.current.togglePolitician("pol-a");
    });
    expect(result.current.subscription).toBeNull();
  });

  it("reverts optimistic update when API responds non-ok", async () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: ["pol-a"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Token required" }),
    });

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.togglePolitician("pol-b");
    });

    expect(result.current.subscription.politicianIds).toEqual(["pol-a"]);
  });

  it("handles rapid sequential toggles without stale closure", async () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: ["pol-a", "pol-b", "pol-c"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });

    const { result } = renderHook(() => useAlertState());

    // Toggle pol-a off
    await act(async () => {
      await result.current.togglePolitician("pol-a");
    });
    expect(result.current.subscription.politicianIds).toEqual(["pol-b", "pol-c"]);

    // Toggle pol-b off immediately after — should read latest state, not stale closure
    await act(async () => {
      await result.current.togglePolitician("pol-b");
    });
    expect(result.current.subscription.politicianIds).toEqual(["pol-c"]);
    // pol-a should NOT be re-added by the second toggle
    expect(result.current.subscription.politicianIds).not.toContain("pol-a");
  });

  it("toggle off then toggle back on produces correct final state", async () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: ["pol-a", "pol-b"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });

    const { result } = renderHook(() => useAlertState());

    // Remove pol-a
    await act(async () => {
      await result.current.togglePolitician("pol-a");
    });
    expect(result.current.isSubscribed("pol-a")).toBe(false);

    // Re-add pol-a
    await act(async () => {
      await result.current.togglePolitician("pol-a");
    });
    expect(result.current.isSubscribed("pol-a")).toBe(true);
    expect(result.current.isSubscribed("pol-b")).toBe(true);
  });

  it("sends token in API call for toggle updates", async () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "my-secret-token",
      politicianIds: ["pol-a"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.togglePolitician("pol-b");
    });

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.token).toBe("my-secret-token");
    expect(body.email).toBe("test@example.com");
    expect(body.politicianIds).toEqual(["pol-a", "pol-b"]);
  });

  it("each toggle sends the cumulative latest politicianIds to the API", async () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: ["pol-a", "pol-b", "pol-c"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.togglePolitician("pol-a");
    });
    await act(async () => {
      await result.current.togglePolitician("pol-c");
    });

    // Second API call should have ["pol-b"] — both pol-a and pol-c removed
    const secondBody = JSON.parse(globalThis.fetch.mock.calls[1][1].body);
    expect(secondBody.politicianIds).toEqual(["pol-b"]);
  });
});

describe("useAlertState — unsubscribe", () => {
  it("calls API and clears state + localStorage", async () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: ["pol-a"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(result.current.subscription).toBeNull();
    expect(storage["politymarket-alert-subscription"]).toBeUndefined();
  });

  it("clears local state even if API fails", async () => {
    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: [],
    });
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(result.current.subscription).toBeNull();
  });
});
