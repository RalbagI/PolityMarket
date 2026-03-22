// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ShareOfVoice from "./ShareOfVoice";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
}));

describe("ShareOfVoice", () => {
  it("renders null when no data", () => {
    const { container } = render(<ShareOfVoice todayData={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders bar segments for each politician", () => {
    const data = [
      { name: "A", media_volume: 10 },
      { name: "B", media_volume: 5 },
      { name: "C", media_volume: 3 },
    ];
    render(<ShareOfVoice todayData={data} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("shows percentages", () => {
    const data = [
      { name: "A", media_volume: 10 },
      { name: "B", media_volume: 10 },
    ];
    render(<ShareOfVoice todayData={data} />);
    // Each should be ~50%
    expect(screen.getAllByText(/50/).length).toBeGreaterThan(0);
  });
});
