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

const normalizeExchangeRates = (rates?: PricingConfig["exchangeRates"]) => {
  const normalized: Record<string, number> = {};
  if (!rates) return normalized;
  for (const [code, value] of Object.entries(rates)) {
    const currency = normalizeCurrency(code);
    if (!Number.isFinite(value) || value <= 0) continue;
    normalized[currency] = value;
  }
  return normalized;
};

const resolveBaseCurrency = (pricing?: PricingConfig | null) =>
  normalizeCurrency(pricing?.baseCurrency ?? pricing?.defaultCurrency ?? "USD");

const resolveSupportedCurrency = (pricing: PricingConfig | null | undefined, currency: string) => {
  const normalized = normalizeCurrency(currency);
  const rates = normalizeExchangeRates(pricing?.exchangeRates);
  if (Object.keys(rates).length === 0) return normalized;
  if (rates[normalized]) return normalized;
  const baseCurrency = resolveBaseCurrency(pricing);
  return rates[baseCurrency] ? baseCurrency : normalized;
};

const resolveExchangeRate = (pricing: PricingConfig | null | undefined, targetCurrency: string) => {
  const baseCurrency = resolveBaseCurrency(pricing);
  const normalizedRates = normalizeExchangeRates(pricing?.exchangeRates);
  const baseRate = normalizedRates[baseCurrency] ?? 1;
  const targetRate = normalizedRates[targetCurrency] ?? (targetCurrency === baseCurrency ? baseRate : null);
  if (!targetRate) return null;
  return targetRate / baseRate;
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
      currency: resolveSupportedCurrency(pricing, pricing?.manualCurrency ?? pricing?.defaultCurrency ?? "USD"),
      mode
    };
  }

  const detectedCurrency = detectCurrencyFromLocale(locale);
  return {
    locale,
    currency: resolveSupportedCurrency(pricing, detectedCurrency || pricing?.defaultCurrency || "USD"),
    mode
  };
};

const resolveRoundingDigits = (currency: string, rounding?: PricingConfig["rounding"]) => {
  if (rounding === "integer") return 0;
  if (rounding === "two-decimal") return 2;
  const zeroDecimalCurrencies = new Set(["RWF", "KES", "UGX", "TZS", "JPY"]);
  return zeroDecimalCurrencies.has(currency) ? 0 : 2;
};

const formatWithCurrency = (value: number, context: CurrencyContext, pricing?: PricingConfig | null) => {
  if (!Number.isFinite(value)) return "";
  const currency = normalizeCurrency(context.currency);
  const roundingDigits = resolveRoundingDigits(currency, pricing?.rounding);
  const locale = context.locale || "en-US";
  if (pricing?.showCurrencyCode) {
    const rounded =
      roundingDigits === 0 ? Math.round(value) : Number(value.toFixed(roundingDigits));
    return `${currency} ${rounded.toLocaleString(locale, {
      minimumFractionDigits: roundingDigits,
      maximumFractionDigits: roundingDigits
    })}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: roundingDigits,
      maximumFractionDigits: roundingDigits
    }).format(value);
  } catch {
    const rounded =
      roundingDigits === 0 ? Math.round(value) : Number(value.toFixed(roundingDigits));
    return `${currency} ${rounded}`;
  }
};

export const formatPriceWithContext = (price: number, context: CurrencyContext, pricing?: PricingConfig | null) => {
  const rate = resolveExchangeRate(pricing, normalizeCurrency(context.currency));
  const converted = rate ? price * rate : price;
  return formatWithCurrency(converted, context, pricing);
};

export const formatPriceBadge = (price: number, pricing?: PricingConfig | null) => {
  const context = resolveCurrencyContext(pricing);
  return formatPriceWithContext(price, context, pricing);
};

export type { CurrencyContext };
