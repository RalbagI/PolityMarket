import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccordionSection from "../../src/components/AccordionSection";

describe("AccordionSection behavior boilerplate", () => {
  it("toggles content visibility when users activate the section header", async () => {
    const user = userEvent.setup();

    render(
      <AccordionSection title="Pipeline Status">
        <p>Integration pipeline is healthy</p>
      </AccordionSection>
    );

    const toggle = screen.getByRole("button", { name: /pipeline status/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/integration pipeline is healthy/i)).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/integration pipeline is healthy/i)).toBeInTheDocument();
  });
});
