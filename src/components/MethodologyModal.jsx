import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import useFocusTrap from "../lib/useFocusTrap";
import { LegalContent, MethodologyContent } from "./MethodologyModalContent";

export default function MethodologyModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const [tab, setTab] = useState("methodology");

  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const title = tab === "methodology" ? t("methodology.title") : t("legal.title");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="methodology-title"
          className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl"
        >
          <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 id="methodology-title" className="text-lg font-bold text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label={t("slidePanel.closeButton.ariaLabel")}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-1 px-6">
              {[
                { key: "methodology", label: t("methodology.title") },
                { key: "legal", label: t("legal.title") },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                    tab === key ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8 px-6 py-6">
            {tab === "methodology" ? <MethodologyContent t={t} /> : <LegalContent t={t} />}
          </div>
        </div>
      </div>
    </>
  );
}
