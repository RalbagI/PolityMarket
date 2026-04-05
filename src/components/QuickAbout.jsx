import { useState, useRef, useEffect, useCallback, useId } from "react";
import { useTranslation } from "react-i18next";
import { Info, Brain, Database, BarChart3, Eye, ChevronLeft } from "lucide-react";
import { logEvent } from "../lib/analytics";

const LINES = [
  { icon: Brain, color: "text-indigo-400", key: "line1" },
  { icon: Database, color: "text-violet-400", key: "line2" },
  { icon: BarChart3, color: "text-emerald-400", key: "line3" },
  { icon: Eye, color: "text-amber-400", key: "line4" },
];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
const INTRO_HIGHLIGHT_MS = 2500;

export default function QuickAbout({ onOpenFullMethodology }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [desktopPosition, setDesktopPosition] = useState(null);
  const [showIntroHighlight, setShowIntroHighlight] = useState(() => {
    if (typeof window === "undefined") return false;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return false;
    }
    return true;
  });
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);
  const dialogId = useId();
  const titleId = useId();

  const updateDesktopPosition = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (
      typeof window.matchMedia !== "function" ||
      !window.matchMedia("(min-width: 768px)").matches
    ) {
      setDesktopPosition(null);
      return;
    }

    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelWidth = 320;
    const edgePadding = 12;
    const isRtl = document.documentElement.dir === "rtl";
    const top = rect.bottom + 8;

    let left = isRtl ? rect.right - panelWidth : rect.left;
    left = Math.max(edgePadding, left);
    left = Math.min(left, window.innerWidth - panelWidth - edgePadding);

    setDesktopPosition({ top: `${top}px`, left: `${left}px` });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setDesktopPosition(null);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const onReposition = () => {
      updateDesktopPosition();
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        return;
      }

      if (e.key !== "Tab" || !popoverRef.current) return;

      const focusables = [...popoverRef.current.querySelectorAll(FOCUSABLE_SELECTOR)];
      if (!focusables.length) {
        e.preventDefault();
        popoverRef.current.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (!popoverRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onClick = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, close, updateDesktopPosition]);

  useEffect(() => {
    if (!open || !popoverRef.current) return;
    const firstFocusable = popoverRef.current.querySelector(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();
  }, [open]);

  useEffect(() => {
    if (!showIntroHighlight) return;
    const timer = window.setTimeout(() => {
      setShowIntroHighlight(false);
    }, INTRO_HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [showIntroHighlight]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => {
          const next = !open;
          setOpen(next);
          setShowIntroHighlight(false);
          if (next) {
            updateDesktopPosition();
            logEvent("open_quick_about");
          }
        }}
        className={`p-1 rounded-md text-gray-400 hover:text-indigo-400 transition-colors md:p-2 ${
          showIntroHighlight
            ? "text-indigo-300 ring-2 ring-indigo-500/70 shadow-[0_0_0_6px_rgba(99,102,241,0.16)] animate-pulse motion-reduce:animate-none"
            : ""
        }`}
        data-intro-highlight={showIntroHighlight ? "true" : "false"}
        aria-label={t("quickAbout.ariaLabel")}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? dialogId : undefined}
      >
        <Info className="w-4 h-4 md:w-6 md:h-6" />
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={close} />

          <div
            id={dialogId}
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            style={desktopPosition || undefined}
            className="
              fixed z-50
              inset-x-3 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)]
              md:inset-x-auto
              max-w-none md:max-w-[320px]
              bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(9,12,18,0.98))]
              border border-gray-800 rounded-xl shadow-2xl p-4
            "
          >
            <h3 id={titleId} className="text-sm font-bold text-white mb-3">
              {t("quickAbout.title")}
            </h3>

            <div className="space-y-2.5">
              {LINES.map(({ icon: Icon, color, key }) => (
                <div
                  key={key}
                  className={`flex items-start gap-2 rounded-lg ${
                    key === "line1" ? "bg-white/5 px-2.5 py-2" : ""
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
                  <span
                    className={`leading-relaxed ${
                      key === "line1" ? "text-sm font-medium text-white" : "text-xs text-gray-300"
                    }`}
                  >
                    {t(`quickAbout.${key}`)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-3 mt-3">
              <button
                onClick={() => {
                  close();
                  onOpenFullMethodology?.();
                }}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <span>{t("quickAbout.fullMethodologyLink")}</span>
                <ChevronLeft className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
