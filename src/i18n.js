import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import he from "./locales/he/translation.json";
import en from "./locales/en/translation.json";

let storedLang = null;
try {
  storedLang = localStorage.getItem("politymarket-lang");
} catch {
  /* SSR / test environments without localStorage */
}

i18n.use(initReactI18next).init({
  resources: {
    he: { translation: he },
    en: { translation: en },
  },
  lng: storedLang || "he",
  fallbackLng: "he",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => {
  if (typeof document === "undefined") return;
  const dir = lng === "he" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
  try {
    localStorage.setItem("politymarket-lang", lng);
  } catch {
    /* ignore in test/SSR */
  }
  document.title =
    lng === "he"
      ? "PolityMarket - מעקב סנטימנט פוליטי ישראלי"
      : "PolityMarket - Israeli Political Sentiment Tracker";
});

export default i18n;
