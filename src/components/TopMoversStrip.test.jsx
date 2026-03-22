// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TopMoversStrip from "./TopMoversStrip";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
}));

const makeData = () => [
  { politician_id: "a", name: "Riser A", displayName: "Riser A", delta: 2.1 },
  { politician_id: "b", name: "Riser B", displayName: "Riser B", delta: 1.5 },
  { politician_id: "c", name: "Faller C", displayName: "Faller C", delta: -1.8 },
  { politician_id: "d", name: "Faller D", displayName: "Faller D", delta: -0.5 },
  { politician_id: "e", name: "No Change", displayName: "No Change", delta: 0 },
  { politician_id: "f", name: "Null Delta", displayName: "Null Delta", delta: null },
];

describe("TopMoversStrip", () => {
  it("renders risers and fallers", () => {
    render(<TopMoversStrip data={makeData()} onSelect={() => {}} />);
    expect(screen.getByText("topMovers.risers")).toBeInTheDocument();
    expect(screen.getByText("topMovers.fallers")).toBeInTheDocument();
    expect(screen.getByText("Riser A")).toBeInTheDocument();
    expect(screen.getByText("Faller C")).toBeInTheDocument();
  });

  it("shows positive deltas with + sign", () => {
    render(<TopMoversStrip data={makeData()} onSelect={() => {}} />);
    expect(screen.getByText("+2.1")).toBeInTheDocument();
    expect(screen.getByText("+1.5")).toBeInTheDocument();
  });

  it("shows negative deltas", () => {
    render(<TopMoversStrip data={makeData()} onSelect={() => {}} />);
    expect(screen.getByText("-1.8")).toBeInTheDocument();
  });

  it("calls onSelect when a mover chip is clicked", () => {
    const onSelect = vi.fn();
    render(<TopMoversStrip data={makeData()} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Riser A"));
    expect(onSelect).toHaveBeenCalledWith("Riser A");
  });

  it("shows no-changes message when all deltas are null", () => {
    const data = [
      { politician_id: "a", name: "A", delta: null },
      { politician_id: "b", name: "B", delta: null },
    ];
    render(<TopMoversStrip data={data} onSelect={() => {}} />);
    expect(screen.getByText("topMovers.noChanges")).toBeInTheDocument();
  });

  it("shows no-changes for empty data", () => {
    render(<TopMoversStrip data={[]} onSelect={() => {}} />);
    expect(screen.getByText("topMovers.noChanges")).toBeInTheDocument();
  });

  it("excludes zero deltas", () => {
    render(<TopMoversStrip data={makeData()} onSelect={() => {}} />);
    expect(screen.queryByText("No Change")).not.toBeInTheDocument();
  });

  it("has region role with aria-label", () => {
    render(<TopMoversStrip data={makeData()} onSelect={() => {}} />);
    expect(screen.getByRole("region")).toHaveAttribute("aria-label", "topMovers.ariaLabel");
  });
});
