import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_CONSENT_KEY } from "./consent";

let storage = {};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
  storage = {};

  vi.stubGlobal("localStorage", {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, val) => {
      storage[key] = String(val);
    },
    removeItem: (key) => {
      delete storage[key];
    },
  });

  delete window.gtag;
  delete window.dataLayer;
  document.getElementById("politymarket-ga-script")?.remove();
});

describe("analytics consent gating", () => {
  it("does not initialize analytics or emit events before consent", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");

    const appendSpy = vi.spyOn(document.head, "appendChild");
    const { initAnalytics, logEvent } = await import("./analytics");

    expect(initAnalytics()).toBe(false);
    logEvent("select_politician", { politician_name: "Test Politician" });

    expect(appendSpy).not.toHaveBeenCalled();
    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
  });

  it("initializes analytics and logs events after consent", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
    storage[COOKIE_CONSENT_KEY] = "accepted";

    const appendSpy = vi.spyOn(document.head, "appendChild");
    const { initAnalytics, logEvent } = await import("./analytics");

    expect(initAnalytics()).toBe(true);
    expect(initAnalytics()).toBe(false);

    const script = document.getElementById("politymarket-ga-script");
    expect(script).toBeInTheDocument();
    expect(script.getAttribute("src")).toContain("G-TEST123");
    expect(appendSpy).toHaveBeenCalledTimes(1);

    // Verify consent commands were pushed to dataLayer
    expect(window.dataLayer[0]).toEqual([
      "consent",
      "default",
      {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    ]);
    expect(window.dataLayer[1]).toEqual(["consent", "update", { analytics_storage: "granted" }]);

    logEvent("select_party", { party_name: "TestParty" });
    expect(window.dataLayer[window.dataLayer.length - 1]).toEqual([
      "event",
      "select_party",
      { party_name: "TestParty" },
    ]);
  });
});
