// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SkeletonLoader from "./SkeletonLoader";

describe("SkeletonLoader", () => {
  it("renders with status role for accessibility", () => {
    render(<SkeletonLoader />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has sr-only loading text", () => {
    render(<SkeletonLoader />);
    const srText = document.querySelector(".sr-only");
    expect(srText).toBeTruthy();
  });

  it("renders animated pulse placeholders", () => {
    const { container } = render(<SkeletonLoader />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
