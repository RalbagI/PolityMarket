import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Brain, BarChart3, Shield, AlertTriangle } from "lucide-react";

export default function MethodologyModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="methodology-title"
          className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <h2 id="methodology-title" className="text-lg font-bold text-white">
              {t("methodology.title")}
            </h2>
            <button
              onClick={onClose}
              aria-label={t("slidePanel.closeButton.ariaLabel")}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-8">
            {/* How It Works */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">
                  {t("methodology.howItWorks.title")}
                </h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {t("methodology.howItWorks.description")}
              </p>
            </section>

            {/* Scoring */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-semibold text-white">
                  {t("methodology.scoring.title")}
                </h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed mb-3">
                {t("methodology.scoring.description")}
              </p>
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t("methodology.scoring.policy")}</span>
                  <span className="text-indigo-400 font-medium">40%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t("methodology.scoring.hostility")}</span>
                  <span className="text-violet-400 font-medium">35%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t("methodology.scoring.amplification")}</span>
                  <span className="text-purple-400 font-medium">25%</span>
                </div>
              </div>
            </section>

            {/* Data Sources */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">
                  {t("methodology.dataSources.title")}
                </h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {t("methodology.dataSources.description")}
              </p>
            </section>

            {/* Legal Disclaimer */}
            <section className="border-t border-gray-800 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">
                  {t("methodology.disclaimer.title")}
                </h3>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-gray-300 leading-relaxed font-medium">
                  {t("methodology.disclaimer.text")}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
