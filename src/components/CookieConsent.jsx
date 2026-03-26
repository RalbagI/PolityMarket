import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Cookie } from "lucide-react";
import { initAnalytics } from "../lib/analytics";
import { COOKIE_CONSENT_KEY, hasAnalyticsConsent } from "../lib/consent";

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => !hasAnalyticsConsent());

  const accept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    } catch {
      // Ignore storage failures: consent cannot be persisted, but UX should still continue.
    }
    initAnalytics();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-3">
      <div className="max-w-lg mx-auto bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl px-5 py-5 md:px-4 md:py-3">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-3">
          <Cookie className="w-8 h-8 md:w-4 md:h-4 text-amber-400 shrink-0" />
          <p className="text-sm md:text-xs text-gray-300 md:text-gray-400 leading-relaxed md:leading-snug text-center md:text-start flex-1">
            {t("cookies.description")}
          </p>
          <button
            onClick={accept}
            className="w-full md:w-auto px-6 py-3 md:px-3 md:py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-base md:text-xs font-medium rounded-lg transition-colors shrink-0"
          >
            {t("cookies.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
