import type { PricingConfig } from "../../shared/siteTypes";

type CurrencyContext = {
  locale: string;
  currency: string;
  mode: "auto" | "manual";
};

const normalizeLocale = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "en-US";
  try {
    return Intl.getCanonicalLocales(trimmed)[0] ?? "en-US";
  } catch {
    return "en-US";
  }
};

const normalizeCurrency = (value: string) => {
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(trimmed)) return "USD";
  return trimmed;
};

const regionToCurrency: Record<string, string> = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  PT: "EUR",
  AT: "EUR",
  FI: "EUR",
  GR: "EUR",
  LU: "EUR",
  CY: "EUR",
  MT: "EUR",
  SI: "EUR",
  SK: "EUR",
  EE: "EUR",
  LV: "EUR",
  LT: "EUR",
  JP: "JPY",
  CN: "CNY",
  IN: "INR",
  AU: "AUD",
  NZ: "NZD",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  TR: "TRY",
  BR: "BRL",
  MX: "MXN",
  ZA: "ZAR",
  NG: "NGN",
  KE: "KES",
  EG: "EGP",
  AE: "AED",
  SA: "SAR",
  IL: "ILS",
  SG: "SGD",
  HK: "HKD",
  KR: "KRW",
  ID: "IDR",
  MY: "MYR",
  TH: "THB",
  VN: "VND",
  PH: "PHP",
  PK: "PKR",
  BD: "BDT",
  LK: "LKR",
  RU: "RUB",
  UA: "UAH"
};

export const detectUserLocale = () => {
  if (typeof navigator === "undefined") return "en-US";
  const preferred = (navigator.languages && navigator.languages[0]) || navigator.language || "en-US";
  return normalizeLocale(preferred);
};

export const detectCurrencyFromLocale = (locale: string) => {
  const normalized = normalizeLocale(locale);
  const parts = normalized.split("-");
  const region = parts.length >= 2 ? parts[parts.length - 1].toUpperCase() : "";
  return regionToCurrency[region] ?? "USD";
};

export const resolveCurrencyContext = (pricing?: PricingConfig | null): CurrencyContext => {
  const mode = pricing?.mode === "manual" ? "manual" : "auto";
  const fallbackLocale = normalizeLocale(pricing?.fallbackLocale ?? "en-US");
  const detectedLocale = detectUserLocale();
  const locale = mode === "manual" ? fallbackLocale : detectedLocale || fallbackLocale;

  if (mode === "manual") {
    return {
      locale,
      currency: normalizeCurrency(pricing?.manualCurrency ?? pricing?.defaultCurrency ?? "USD"),
      mode
    };
  }

  const detectedCurrency = detectCurrencyFromLocale(locale);
  return {
    locale,
    currency: normalizeCurrency(detectedCurrency || pricing?.defaultCurrency || "USD"),
    mode
  };
};

export const formatPriceWithContext = (price: number, context: CurrencyContext) => {
  if (!Number.isFinite(price)) return "";
  try {
    return new Intl.NumberFormat(context.locale, {
      style: "currency",
      currency: context.currency,
      maximumFractionDigits: 0
    }).format(price);
  } catch {
    return `${context.currency} ${Math.round(price)}`;
  }
};

export const formatPriceBadge = (price: number, pricing?: PricingConfig | null) => {
  const context = resolveCurrencyContext(pricing);
  return formatPriceWithContext(price, context);
};

export type { CurrencyContext };
