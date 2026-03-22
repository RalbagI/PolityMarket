// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CookieConsent from "./CookieConsent";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

const CONSENT_KEY = "politymarket-cookie-consent";
let storage = {};

beforeEach(() => {
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
});

describe("CookieConsent", () => {
  it("shows banner when no consent in localStorage", () => {
    render(<CookieConsent />);
    expect(screen.getByText("cookies.description")).toBeInTheDocument();
  });

  it("hides banner when consent already given", () => {
    storage[CONSENT_KEY] = "true";
    render(<CookieConsent />);
    expect(screen.queryByText("cookies.description")).not.toBeInTheDocument();
  });

  it("hides banner and saves to localStorage on accept", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText("cookies.accept"));
    expect(screen.queryByText("cookies.description")).not.toBeInTheDocument();
    expect(storage[CONSENT_KEY]).toBe("accepted");
  });
});
