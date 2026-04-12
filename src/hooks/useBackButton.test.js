import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useBackButton from "./useBackButton";

describe("useBackButton", () => {
  let pushStateSpy;
  let backSpy;
  let addEventSpy;
  let removeEventSpy;

  beforeEach(() => {
    pushStateSpy = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    addEventSpy = vi.spyOn(window, "addEventListener");
    removeEventSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pushes a history entry when isOpen becomes true", () => {
    renderHook(() => useBackButton(true, vi.fn()));

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(pushStateSpy).toHaveBeenCalledWith({ panelOpen: true }, "");
  });

  it("does not push a history entry when isOpen is false", () => {
    renderHook(() => useBackButton(false, vi.fn()));

    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it("registers a popstate listener when open", () => {
    renderHook(() => useBackButton(true, vi.fn()));

    expect(addEventSpy).toHaveBeenCalledWith("popstate", expect.any(Function));
  });

  it("calls onClose when popstate fires (back button pressed)", () => {
    const onClose = vi.fn();
    renderHook(() => useBackButton(true, onClose));

    // Simulate back button press
    const popstateHandler = addEventSpy.mock.calls.find((c) => c[0] === "popstate")[1];
    popstateHandler();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call history.back on cleanup when closed via back button", () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useBackButton(true, onClose));

    // Simulate back button press (consumes the sentinel)
    const popstateHandler = addEventSpy.mock.calls.find((c) => c[0] === "popstate")[1];
    popstateHandler();

    unmount();

    // history.back should NOT be called because the sentinel was already popped
    expect(backSpy).not.toHaveBeenCalled();
  });

  it("calls history.back on cleanup when panel closed programmatically", () => {
    const { unmount } = renderHook(() => useBackButton(true, vi.fn()));

    // Unmount without triggering popstate (simulates programmatic close)
    unmount();

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it("removes popstate listener on cleanup", () => {
    const { unmount } = renderHook(() => useBackButton(true, vi.fn()));

    unmount();

    expect(removeEventSpy).toHaveBeenCalledWith("popstate", expect.any(Function));
  });

  it("re-pushes history entry when panel is re-opened", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(({ isOpen }) => useBackButton(isOpen, onClose), {
      initialProps: { isOpen: true },
    });

    expect(pushStateSpy).toHaveBeenCalledTimes(1);

    // Close panel
    rerender({ isOpen: false });
    pushStateSpy.mockClear();

    // Re-open panel
    rerender({ isOpen: true });
    expect(pushStateSpy).toHaveBeenCalledTimes(1);
  });
});
