import { useEffect, useRef } from "react";

/**
 * Traps focus within a container when active.
 * Tab/Shift+Tab cycles through focusable elements.
 * Restores focus to the previously focused element on close.
 */
export default function useFocusTrap(containerRef, isActive) {
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    previousFocusRef.current = document.activeElement;

    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    // Focus first focusable element
    const firstFocusable = container.querySelector(focusableSelector);
    if (firstFocusable) firstFocusable.focus();

    function handleKeyDown(e) {
      if (e.key !== "Tab") return;

      const focusables = [...container.querySelectorAll(focusableSelector)];
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, containerRef]);
}
