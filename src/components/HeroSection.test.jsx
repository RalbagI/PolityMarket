import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroSection from "./HeroSection";

const PARTY_COLORS = {
  Likud: "#2563eb",
  "Yesh Atid": "#f59e0b",
};

describe("HeroSection", () => {
  const mover = {
    name: "Benjamin Netanyahu",
    party: "Likud",
    overall_score: 7.5,
    delta: 1.2,
    previousScore: 6.3,
    chain_of_thought: "Strong positive coverage today.",
  };

  it("renders the biggest mover name", () => {
    render(<HeroSection mover={mover} partyColors={PARTY_COLORS} />);
    expect(screen.getByText("Benjamin Netanyahu")).toBeInTheDocument();
  });

  it("renders the party badge", () => {
    render(<HeroSection mover={mover} partyColors={PARTY_COLORS} />);
    expect(screen.getByText("Likud")).toBeInTheDocument();
  });

  it("renders the overall score", () => {
    render(<HeroSection mover={mover} partyColors={PARTY_COLORS} />);
    expect(screen.getByText("7.5")).toBeInTheDocument();
  });

  it("renders positive delta with + prefix", () => {
    render(<HeroSection mover={mover} partyColors={PARTY_COLORS} />);
    expect(screen.getByText("+1.2")).toBeInTheDocument();
  });

  it("renders negative delta without + prefix", () => {
    const negativeMover = { ...mover, delta: -0.8, overall_score: 5.5 };
    render(<HeroSection mover={negativeMover} partyColors={PARTY_COLORS} />);
    expect(screen.getByText("-0.8")).toBeInTheDocument();
  });

  it("renders the LLM reasoning quote", () => {
    render(<HeroSection mover={mover} partyColors={PARTY_COLORS} />);
    expect(screen.getByText(/Strong positive coverage today/)).toBeInTheDocument();
  });
});
