import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import useFocusTrap from "../lib/useFocusTrap";

export default function SlidePanel({ isOpen, onClose, title, children }) {
  const { t } = useTranslation();
  const panelRef = useRef(null);
  const titleId = "slide-panel-title";
  useFocusTrap(panelRef, isOpen);

  // Close on click outside (fallback for non-backdrop clicks)
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Swipe-to-close for mobile bottom sheet
  const touchStartY = useRef(0);
  const handleSwipeStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleSwipeEnd = useCallback(
    (e) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const deltaY = touch.clientY - touchStartY.current;
      if (deltaY > 80) onClose();
    },
    [onClose]
  );

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop — explicit onClick as primary dismiss */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — slides from inline-end (left in RTL), bottom on mobile */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed z-50 bg-gray-900 border-gray-800 shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out
          slide-panel sm:h-full sm:w-[380px] lg:w-[420px] sm:border-e
          ${isOpen ? "slide-panel-visible" : "slide-panel-hidden"}
          max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[85vh] max-sm:rounded-t-2xl max-sm:border-t
          ${isOpen ? "max-sm:translate-y-0" : "max-sm:translate-y-full"}
        `}
      >
        {/* Swipe indicator + drag handle for mobile bottom sheet */}
        <div
          className="sm:hidden flex justify-center pt-2 pb-1 cursor-grab"
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h3 id={titleId} className="text-base sm:text-lg font-semibold text-white truncate">
            {title || t("slidePanel.defaultTitle")}
          </h3>
          <button
            onClick={onClose}
            aria-label={t("slidePanel.closeButton.ariaLabel")}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}

          {/* TalkPoint attribution — desktop side panel */}
          <div className="hidden sm:block mt-6 pt-4 border-t border-gray-800 text-center text-xs text-gray-500">
            by{" "}
            <a
              href="https://tipi.zone/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              TalkPoint LTD
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
