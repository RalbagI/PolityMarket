// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EntityCard from "./EntityCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => opts.defaultValue || key,
  }),
}));

vi.mock("../lib/partyColors", () => ({
  getPartyColor: () => ({ bg: "#1e40af", text: "#dbeafe" }),
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
  localizeParty: (_t, party) => party,
}));

vi.mock("./Avatar", () => ({
  default: () => <div data-testid="avatar" />,
}));

const baseEntry = {
  name: "Test Politician",
  party: "TestParty",
  politician_id: "test-pol",
  overall_score: 7.2,
  media_volume: 5,
};

describe("EntityCard", () => {
  it("renders politician name and party", () => {
    render(<EntityCard entry={baseEntry} onSelect={() => {}} />);
    expect(screen.getByText("Test Politician")).toBeInTheDocument();
    expect(screen.getByText("TestParty")).toBeInTheDocument();
  });

  it("renders score", () => {
    render(<EntityCard entry={baseEntry} onSelect={() => {}} />);
    expect(screen.getByText("7.2")).toBeInTheDocument();
  });

  it("calls onSelect with name on click", () => {
    const onSelect = vi.fn();
    render(<EntityCard entry={baseEntry} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("Test Politician");
  });

  it("calls onSelect on Enter key", () => {
    const onSelect = vi.fn();
    render(<EntityCard entry={baseEntry} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("Test Politician");
  });

  it("shows positive delta indicator", () => {
    render(<EntityCard entry={baseEntry} delta={0.5} onSelect={() => {}} />);
    expect(screen.getByText(/0\.5/)).toBeInTheDocument();
  });

  it("shows negative delta indicator", () => {
    render(<EntityCard entry={baseEntry} delta={-0.3} onSelect={() => {}} />);
    expect(screen.getByText(/0\.3/)).toBeInTheDocument();
  });

  it("does not show delta when null", () => {
    const { container } = render(<EntityCard entry={baseEntry} delta={null} onSelect={() => {}} />);
    // No delta text should exist
    expect(container.textContent).not.toMatch(/\+0\./);
  });

  it("applies selected ring when isSelected", () => {
    const { container } = render(<EntityCard entry={baseEntry} isSelected onSelect={() => {}} />);
    const card = container.querySelector("[role='button']");
    expect(card.className).toContain("ring-2");
  });
});
