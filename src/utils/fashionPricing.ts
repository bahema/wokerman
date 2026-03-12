import { getCachedPublishedFashionContent } from "./fashionDraft";

export type FashionCurrencyCode = "USD" | "EUR" | "GBP" | "RWF";
export type FashionLocaleCode = "en-US" | "en-GB" | "fr-FR" | "sw-KE" | "en-RW";

const RATE_MAP: Record<FashionCurrencyCode, number> = {
  USD: 1,
  EUR: 0.93,
  GBP: 0.79,
  RWF: 1325
};

export const fashionCurrencyOptions: Array<{ code: FashionCurrencyCode; label: string }> = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "RWF", label: "Rwandan Franc" }
];

export const fashionLocaleOptions: Array<{ code: FashionLocaleCode; label: string }> = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "fr-FR", label: "Francais (FR)" },
  { code: "sw-KE", label: "Kiswahili (KE)" },
  { code: "en-RW", label: "English (RW)" }
];

export type FashionPricingPreferences = {
  currency: FashionCurrencyCode;
  locale: string;
};

export const getFashionCurrencyCode = (): FashionCurrencyCode => {
  try {
    const code = getCachedPublishedFashionContent().pricing?.currency;
    return code && RATE_MAP[code] ? code : "USD";
  } catch {
    return "USD";
  }
};

export const getFashionPricingPreferences = (): FashionPricingPreferences => {
  const fallbackLocale =
    typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
  try {
    const pricing = getCachedPublishedFashionContent().pricing;
    const currency = pricing?.currency && RATE_MAP[pricing.currency] ? pricing.currency : "USD";
    const locale = pricing?.locale?.trim() || fallbackLocale;
    return { currency, locale };
  } catch {
    return { currency: "USD", locale: fallbackLocale };
  }
};

export const formatFashionPrice = (
  baseUsdPrice: number,
  options?: FashionCurrencyCode | Partial<FashionPricingPreferences>
) => {
  const preference = getFashionPricingPreferences();
  const currency = typeof options === "string" ? options : options?.currency ?? preference.currency;
  const locale = typeof options === "string" ? preference.locale : options?.locale ?? preference.locale;
  const safeCurrency = RATE_MAP[currency] ? currency : "USD";
  const converted = baseUsdPrice * RATE_MAP[safeCurrency];
  if (safeCurrency === "RWF") {
    return `FRw ${Math.round(converted).toLocaleString(locale || "en-RW")}`;
  }

  return new Intl.NumberFormat(locale || "en-US", {
    style: "currency",
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(converted);
};
