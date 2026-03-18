import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Cookie } from "lucide-react";

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
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-3">
      <div className="max-w-lg mx-auto bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Cookie className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="flex-1 text-xs text-gray-400 leading-snug">{t("cookies.description")}</p>
          <button
            onClick={accept}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
          >
            {t("cookies.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
