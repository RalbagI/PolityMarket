import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function SlidePanel({ isOpen, onClose, title, children }) {
  const panelRef = useRef(null);
  const titleId = "slide-panel-title";

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

      {/* Panel — right on desktop, bottom on mobile */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed z-50 bg-gray-900 border-gray-800 shadow-2xl overflow-y-auto transition-transform duration-300 ease-in-out
          sm:top-0 sm:right-0 sm:h-full sm:w-[420px] sm:border-l
          ${isOpen ? "sm:translate-x-0" : "sm:translate-x-full"}
          max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[85vh] max-sm:rounded-t-2xl max-sm:border-t
          ${isOpen ? "max-sm:translate-y-0" : "max-sm:translate-y-full"}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <h3 id={titleId} className="text-lg font-semibold text-white truncate">
            {title || "Details"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </>
  );
}
