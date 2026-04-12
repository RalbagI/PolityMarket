import { useEffect, useRef } from "react";

/**
 * Intercepts the browser back button so that closing an overlay (e.g. the
 * politician detail panel) doesn't navigate away from the webapp.
 *
 * When `isOpen` becomes true a dummy history entry is pushed.  Pressing "back"
 * pops that entry and fires `onClose` instead of leaving the page.  When the
 * overlay is closed programmatically (X button, backdrop tap, etc.) the dummy
 * entry is removed via `history.back()`.
 */
export default function useBackButton(isOpen, onClose) {
  // Track whether *we* pushed the sentinel entry so we only pop our own.
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    // Push a sentinel history entry when the overlay opens.
    window.history.pushState({ panelOpen: true }, "");
    pushedRef.current = true;

    const handlePopState = () => {
      // The sentinel was just popped (user pressed back) → close the panel.
      if (pushedRef.current) {
        pushedRef.current = false;
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      // If the panel was closed programmatically (not via back button) the
      // sentinel entry is still on the stack — remove it.
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}
