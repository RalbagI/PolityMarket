// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SlidePanel from "./SlidePanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
}));

vi.mock("../lib/useFocusTrap", () => ({
  default: () => {},
}));

describe("SlidePanel", () => {
  it("renders children when open", () => {
    render(
      <SlidePanel isOpen={true} onClose={() => {}} title="Test">
        <p>Panel content</p>
      </SlidePanel>
    );
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });

  it("renders title in header", () => {
    render(
      <SlidePanel isOpen={true} onClose={() => {}} title="My Title">
        <p>Content</p>
      </SlidePanel>
    );
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <SlidePanel isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </SlidePanel>
    );

    const closeButton = screen.getByRole("button", {
      name: "slidePanel.closeButton.ariaLabel",
    });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <SlidePanel isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </SlidePanel>
    );

    // Backdrop is the first aria-hidden div
    const backdrop = document.querySelector("[aria-hidden='true']");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(
      <SlidePanel isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </SlidePanel>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on swipe-down gesture (>80px)", () => {
    const onClose = vi.fn();
    render(
      <SlidePanel isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </SlidePanel>
    );

    // The drag handle is the cursor-grab div
    const dragHandle = document.querySelector(".cursor-grab");
    expect(dragHandle).toBeTruthy();

    fireEvent.touchStart(dragHandle, {
      touches: [{ clientY: 100 }],
    });
    fireEvent.touchEnd(dragHandle, {
      changedTouches: [{ clientY: 200 }], // 100px swipe down > 80px threshold
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT close on small swipe (<80px)", () => {
    const onClose = vi.fn();
    render(
      <SlidePanel isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </SlidePanel>
    );

    const dragHandle = document.querySelector(".cursor-grab");

    fireEvent.touchStart(dragHandle, {
      touches: [{ clientY: 100 }],
    });
    fireEvent.touchEnd(dragHandle, {
      changedTouches: [{ clientY: 150 }], // 50px — below threshold
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("has safe-area bottom padding on content", () => {
    render(
      <SlidePanel isOpen={true} onClose={() => {}} title="Test">
        <p>Content</p>
      </SlidePanel>
    );

    const content = screen.getByText("Content").parentElement;
    expect(content.className).toContain("pb-[max(1rem,env(safe-area-inset-bottom))]");
  });

  it("disables body scroll when open", () => {
    const { unmount } = render(
      <SlidePanel isOpen={true} onClose={() => {}} title="Test">
        <p>Content</p>
      </SlidePanel>
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
