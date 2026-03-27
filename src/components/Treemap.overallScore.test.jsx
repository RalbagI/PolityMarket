// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Treemap from "./Treemap";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === "string" ? fallback : key),
  }),
}));

vi.mock("../store", () => ({
  default: (selector) =>
    selector({
      treemapSizeBy: "overall_score",
      treemapColorBy: "overall_score",
    }),
}));

vi.mock("../lib/colorScale", () => ({
  normalizedScoreToColorWithAlpha: () => "rgba(100,200,100,0.55)",
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
}));

vi.mock("./TreemapTooltip", () => ({
  default: () => null,
}));

class MockResizeObserver {
  constructor(cb) {
    this._cb = cb;
  }
  observe() {
    this._cb([{ contentRect: { width: 800, height: 600 } }]);
  }
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

describe("Treemap overall_score size mode", () => {
  it("renders politicians when normalized fields are missing", () => {
    const data = [
      {
        politician_id: "alice",
        name: "Alice",
        displayName: "Alice",
        party: "TestParty",
        overall_score: 8,
        media_volume: 120,
      },
      {
        politician_id: "bob",
        name: "Bob",
        displayName: "Bob",
        party: "TestParty",
        overall_score: 0,
        media_volume: 0,
      },
    ];

    render(<Treemap data={data} onSelect={() => {}} selectedPolitician={null} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
