// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickAbout from "./QuickAbout";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("../lib/analytics", () => ({
  logEvent: vi.fn(),
}));

describe("QuickAbout", () => {
  it("renders the info icon button", () => {
    render(<QuickAbout onOpenFullMethodology={() => {}} />);
    expect(screen.getByLabelText("quickAbout.ariaLabel")).toBeInTheDocument();
  });

  it("opens popover when icon is clicked", () => {
    render(<QuickAbout onOpenFullMethodology={() => {}} />);
    fireEvent.click(screen.getByLabelText("quickAbout.ariaLabel"));
    expect(screen.getByText("quickAbout.title")).toBeInTheDocument();
    expect(screen.getByText("quickAbout.line1")).toBeInTheDocument();
    expect(screen.getByText("quickAbout.line2")).toBeInTheDocument();
    expect(screen.getByText("quickAbout.line3")).toBeInTheDocument();
    expect(screen.getByText("quickAbout.line4")).toBeInTheDocument();
  });

  it("closes popover when icon is clicked again", () => {
    render(<QuickAbout onOpenFullMethodology={() => {}} />);
    const trigger = screen.getByLabelText("quickAbout.ariaLabel");
    fireEvent.click(trigger);
    expect(screen.getByText("quickAbout.title")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByText("quickAbout.title")).not.toBeInTheDocument();
  });

  it("closes popover on Escape key", () => {
    render(<QuickAbout onOpenFullMethodology={() => {}} />);
    fireEvent.click(screen.getByLabelText("quickAbout.ariaLabel"));
    expect(screen.getByText("quickAbout.title")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("quickAbout.title")).not.toBeInTheDocument();
  });

  it("calls onOpenFullMethodology and closes when footer link is clicked", () => {
    const onOpen = vi.fn();
    render(<QuickAbout onOpenFullMethodology={onOpen} />);
    fireEvent.click(screen.getByLabelText("quickAbout.ariaLabel"));
    fireEvent.click(screen.getByText("quickAbout.fullMethodologyLink"));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(screen.queryByText("quickAbout.title")).not.toBeInTheDocument();
  });

  it("sets aria-expanded correctly", () => {
    render(<QuickAbout onOpenFullMethodology={() => {}} />);
    const trigger = screen.getByLabelText("quickAbout.ariaLabel");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("logs analytics event when opened", async () => {
    const { logEvent } = await import("../lib/analytics");
    render(<QuickAbout onOpenFullMethodology={() => {}} />);
    fireEvent.click(screen.getByLabelText("quickAbout.ariaLabel"));
    expect(logEvent).toHaveBeenCalledWith("open_quick_about");
  });
});
