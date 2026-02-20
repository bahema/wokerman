import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { messages, type AppLocale, type MessageKey } from "./messages";

type TranslateParams = Record<string, string | number>;

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
  direction: "ltr" | "rtl";
  ogLocale: "en_US" | "ar_SA";
  t: (key: MessageKey, params?: TranslateParams) => string;
};

const STORAGE_KEY = "autohub:locale";

const detectInitialLocale = (): AppLocale => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ar") return stored;
  const browser = navigator.language?.toLowerCase() ?? "en";
  return browser.startsWith("ar") ? "ar" : "en";
};

const formatMessage = (template: string, params?: TranslateParams) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(params[key] ?? ""));
};

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<AppLocale>(() => detectInitialLocale());

  useEffect(() => {
    if (typeof document === "undefined") return;
    const direction = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const direction = locale === "ar" ? "rtl" : "ltr";
    const ogLocale: "en_US" | "ar_SA" = locale === "ar" ? "ar_SA" : "en_US";
    const t = (key: MessageKey, params?: TranslateParams) => {
      const template = messages[locale][key] ?? messages.en[key];
      return formatMessage(template, params);
    };
    return {
      locale,
      setLocale: setLocaleState,
      direction,
      ogLocale,
      t
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider.");
  return context;
};
