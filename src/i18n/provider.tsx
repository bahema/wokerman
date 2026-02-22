import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { messages, type AppLocale, type MessageKey } from "./messages";

type TranslateParams = Record<string, string | number>;

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
  direction: "ltr" | "rtl";
  ogLocale: string;
  t: (key: MessageKey, params?: TranslateParams) => string;
};

const STORAGE_KEY = "autohub:locale";
const SUPPORTED_LOCALES: AppLocale[] = ["en", "ar", "es", "fr", "de", "pt", "hi", "zh", "ja", "ru"];

const isSupportedLocale = (value: string): value is AppLocale => SUPPORTED_LOCALES.includes(value as AppLocale);

const toLocaleCode = (value: string): AppLocale | null => {
  const lowered = value.trim().toLowerCase();
  if (!lowered) return null;
  if (isSupportedLocale(lowered)) return lowered;
  if (lowered.startsWith("ar")) return "ar";
  if (lowered.startsWith("es")) return "es";
  if (lowered.startsWith("fr")) return "fr";
  if (lowered.startsWith("de")) return "de";
  if (lowered.startsWith("pt")) return "pt";
  if (lowered.startsWith("hi")) return "hi";
  if (lowered.startsWith("zh")) return "zh";
  if (lowered.startsWith("ja")) return "ja";
  if (lowered.startsWith("ru")) return "ru";
  if (lowered.startsWith("en")) return "en";
  return null;
};

const OG_LOCALE_BY_APP_LOCALE: Record<AppLocale, string> = {
  en: "en_US",
  ar: "ar_SA",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
  pt: "pt_BR",
  hi: "hi_IN",
  zh: "zh_CN",
  ja: "ja_JP",
  ru: "ru_RU"
};

const detectInitialLocale = (): AppLocale => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && isSupportedLocale(stored)) return stored;
  for (const candidate of navigator.languages ?? []) {
    const resolved = toLocaleCode(candidate);
    if (resolved) return resolved;
  }
  return toLocaleCode(navigator.language ?? "en") ?? "en";
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
    const ogLocale = OG_LOCALE_BY_APP_LOCALE[locale] ?? "en_US";
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
