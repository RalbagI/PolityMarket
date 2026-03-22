// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AccordionSection from "./AccordionSection";

describe("AccordionSection", () => {
  it("renders title", () => {
    render(<AccordionSection title="Test Section">Content</AccordionSection>);
    expect(screen.getByText("Test Section")).toBeInTheDocument();
  });

  it("is collapsed by default", () => {
    render(<AccordionSection title="Section">Hidden content</AccordionSection>);
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("opens when defaultOpen is true", () => {
    render(
      <AccordionSection title="Section" defaultOpen>
        Visible content
      </AccordionSection>
    );
    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });

  it("toggles open/closed on click", () => {
    render(<AccordionSection title="Section">Toggle me</AccordionSection>);
    expect(screen.queryByText("Toggle me")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Toggle me")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Toggle me")).not.toBeInTheDocument();
  });

  it("has correct aria-expanded attribute", () => {
    render(<AccordionSection title="Section">Content</AccordionSection>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
