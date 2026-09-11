import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LANGUAGES, isRTL } from "./languages";
import { TRANSLATIONS } from "./translations";

export { LANGUAGES, isRTL } from "./languages";
export { TRANSLATIONS } from "./translations";

const resources: Record<string, { translation: any }> = {};
for (const [code, trans] of Object.entries(TRANSLATIONS)) {
  resources[code] = { translation: trans };
}

export function applyLanguageDirection(languageCode: string) {
  if (typeof document === "undefined") return;
  const rtl = isRTL(languageCode);
  document.documentElement.dir = rtl ? "rtl" : "ltr";
  document.documentElement.lang = languageCode;
  if (rtl) {
    document.documentElement.classList.add("rtl");
  } else {
    document.documentElement.classList.remove("rtl");
  }
}

const initialLanguage =
  (typeof localStorage !== "undefined"
    ? localStorage.getItem("recallx-language")
    : null) || "en";

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Apply direction on initial load
applyLanguageDirection(initialLanguage);

// Keep direction synced on language change
i18n.on("languageChanged", (lng) => {
  applyLanguageDirection(lng);
});

export default i18n;
