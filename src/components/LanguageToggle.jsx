import { useTranslation } from "react-i18next";

export default function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === "he";

  return (
    <button
      onClick={() => i18n.changeLanguage(isHebrew ? "en" : "he")}
      className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-colors"
      aria-label={
        isHebrew ? t("languageToggle.switchToEnglish") : t("languageToggle.switchToHebrew")
      }
    >
      {isHebrew ? "EN" : "\u05E2\u05D1"}
    </button>
  );
}
