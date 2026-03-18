import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Cookie, X } from "lucide-react";

const CONSENT_KEY = "politymarket-cookie-consent";

function hasConsented() {
  try {
    return !!localStorage.getItem(CONSENT_KEY);
  } catch {
    return true;
  }
}

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => !hasConsented());

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 md:p-6">
      <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 md:p-5">
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1">{t("cookies.title")}</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">{t("cookies.description")}</p>
            <ul className="text-xs text-gray-500 space-y-1 mb-3">
              <li>• {t("cookies.item1")}</li>
              <li>• {t("cookies.item2")}</li>
              <li>• {t("cookies.item3")}</li>
            </ul>
            <div className="flex items-center gap-3">
              <button
                onClick={accept}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {t("cookies.accept")}
              </button>
              <span className="text-[10px] text-gray-600">{t("cookies.note")}</span>
            </div>
          </div>
          <button
            onClick={accept}
            className="p-1 text-gray-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
