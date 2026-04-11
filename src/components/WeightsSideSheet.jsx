import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, RotateCcw } from "lucide-react";
import { BALANCED_WEIGHTS, DIM_KEYS, weightsAreBalanced } from "../utils/rescoring";
import useFocusTrap from "../lib/useFocusTrap";

/**
 * Opt-in side sheet for personalized dim weighting. Uses the 8 real dimensions
 * one-to-one with plain-language labels pulled from i18n.
 */
export default function WeightsSideSheet({ isOpen, onClose, weightsApi }) {
  const { t } = useTranslation();
  const sheetRef = useRef(null);
  useFocusTrap(sheetRef, isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const balanced = weightsAreBalanced(weightsApi.weights);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("weights.title")}
        className="fixed top-0 inset-inline-end-0 z-50 h-screen w-[min(380px,92vw)] overflow-y-auto border-s border-gray-800 bg-gray-950 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur">
          <div>
            <h2 className="text-sm font-bold text-white">{t("weights.title")}</h2>
            <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{t("weights.intro")}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800"
            aria-label={t("weights.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {DIM_KEYS.map((key) => {
            const current = Number.isFinite(weightsApi.weights[key])
              ? weightsApi.weights[key]
              : BALANCED_WEIGHTS[key];
            return (
              <div key={key}>
                <div className="mb-1 flex items-baseline justify-between">
                  <label htmlFor={`w-${key}`} className="text-xs font-semibold text-gray-200">
                    {t(`weights.dims.${key}.label`)}
                  </label>
                  <span className="text-[10px] tabular-nums text-gray-500" dir="ltr">
                    {(weightsApi.normalized[key] * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mb-1.5 text-[10px] leading-tight text-gray-500">
                  {t(`weights.dims.${key}.hint`)}
                </p>
                <input
                  id={`w-${key}`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={current}
                  onChange={(e) => weightsApi.setWeight(key, Number(e.target.value))}
                  className="w-full accent-indigo-500"
                  aria-label={t(`weights.dims.${key}.label`)}
                />
              </div>
            );
          })}

          <button
            onClick={weightsApi.reset}
            disabled={balanced}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("weights.reset")}
          </button>

          <p className="text-[11px] leading-snug text-gray-500">{t("weights.note")}</p>
        </div>
      </aside>
    </>
  );
}
