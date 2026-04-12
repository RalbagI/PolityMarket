// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MethodologyModal from "./MethodologyModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      const dict = {
        "methodology.title": "Methodology",
        "methodology.close": "Close",
      };
      return dict[key] || key;
    },
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
}));

vi.mock("../lib/useFocusTrap", () => ({
  default: () => {},
}));

describe("MethodologyModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<MethodologyModal isOpen={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders modal content when open", () => {
    render(<MethodologyModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Title rendered in h2 and tab — use getAllByText with the mock-translated value
    expect(screen.getAllByText("Methodology").length).toBeGreaterThan(0);
  });

  it("has dialog role and aria-modal", () => {
    render(<MethodologyModal isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(<MethodologyModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("disables body scroll when open", () => {
    const { unmount } = render(<MethodologyModal isOpen={true} onClose={() => {}} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("renders the lenses and personalization sections", () => {
    render(<MethodologyModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("methodology.lenses.title")).toBeInTheDocument();
    expect(screen.getByText("methodology.lenses.momentumTitle")).toBeInTheDocument();
    expect(screen.getByText("methodology.lenses.marketTitle")).toBeInTheDocument();
    expect(screen.getByText("methodology.lenses.yourScoreTitle")).toBeInTheDocument();
    expect(screen.getByText("methodology.lenses.momentumFormula")).toBeInTheDocument();
    expect(screen.getByText("methodology.personalization.title")).toBeInTheDocument();
    expect(screen.getByText("methodology.personalization.heroTitle")).toBeInTheDocument();
    expect(screen.getByText("methodology.personalization.weightsTitle")).toBeInTheDocument();
    expect(screen.getByText("methodology.personalization.weightsMath")).toBeInTheDocument();
    expect(screen.getByText("methodology.visualization.sparkline")).toBeInTheDocument();
    expect(screen.getByText("methodology.visualization.pulse")).toBeInTheDocument();
  });
});
