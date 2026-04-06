// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CookieConsent from "./CookieConsent";
import { initAnalytics } from "../lib/analytics";
import { COOKIE_CONSENT_KEY } from "../lib/consent";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
}));

vi.mock("../lib/analytics", () => ({
  initAnalytics: vi.fn(),
}));

let storage = {};

beforeEach(() => {
  storage = {};
  vi.mocked(initAnalytics).mockReset();
  vi.stubGlobal("localStorage", {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, val) => {
      storage[key] = String(val);
    },
    removeItem: (key) => {
      delete storage[key];
    },
  });
});

describe("CookieConsent", () => {
  it("shows banner when no consent in localStorage", () => {
    render(<CookieConsent />);
    expect(screen.getByText("cookies.description")).toBeInTheDocument();
  });

  it("hides banner when consent already given", () => {
    storage[COOKIE_CONSENT_KEY] = "true";
    render(<CookieConsent />);
    expect(screen.queryByText("cookies.description")).not.toBeInTheDocument();
  });

  it("hides banner, saves consent, and initializes analytics on accept", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText("cookies.accept"));
    expect(screen.queryByText("cookies.description")).not.toBeInTheDocument();
    expect(storage[COOKIE_CONSENT_KEY]).toBe("accepted");
    expect(initAnalytics).toHaveBeenCalledTimes(1);
  });
});
