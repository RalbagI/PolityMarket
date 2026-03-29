import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Info, Brain, Database, BarChart3, Eye, ChevronLeft } from "lucide-react";
import { logEvent } from "../lib/analytics";

const LINES = [
  { icon: Brain, color: "text-indigo-400", key: "line1" },
  { icon: Database, color: "text-violet-400", key: "line2" },
  { icon: BarChart3, color: "text-emerald-400", key: "line3" },
  { icon: Eye, color: "text-amber-400", key: "line4" },
];

export default function QuickAbout({ onOpenFullMethodology }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
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
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, close]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) logEvent("open_quick_about");
        }}
        className="p-1 rounded-md text-gray-500 hover:text-indigo-400 transition-colors"
        aria-label={t("quickAbout.ariaLabel")}
        aria-expanded={open}
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={close} />

          <div
            ref={popoverRef}
            role="dialog"
            aria-labelledby="quick-about-title"
            className="
              fixed md:absolute z-50
              inset-x-3 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)]
              md:inset-x-auto md:top-full md:mt-2 md:start-0
              max-w-none md:max-w-[260px]
              bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-4
            "
          >
            <h3 id="quick-about-title" className="text-sm font-bold text-white mb-3">
              {t("quickAbout.title")}
            </h3>

            <div className="space-y-2.5">
              {LINES.map(({ icon: Icon, color, key }) => (
                <div key={key} className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
                  <span className="text-xs text-gray-300 leading-relaxed">
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
