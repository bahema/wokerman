import type { PricingConfig } from "../../shared/siteTypes";
import { formatPriceBadge, resolveCurrencyContext } from "./pricing";
import { getCachedPublishedFashionContent } from "./fashionDraft";

export type FashionCurrencyCode = "USD" | "EUR" | "GBP" | "RWF";
export type FashionLocaleCode = "en-US" | "en-GB" | "fr-FR" | "sw-KE" | "en-RW";

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

const SITE_PUBLISHED_CACHE_KEY = "site:published:cache";

const readSitePricing = (): PricingConfig | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SITE_PUBLISHED_CACHE_KEY);
    if (!raw) return null;
    const content = JSON.parse(raw) as { pricing?: PricingConfig };
    return content.pricing ?? null;
  } catch {
    return null;
  }
};

const buildFallbackPricing = (): PricingConfig => {
  const fashionPricing = getCachedPublishedFashionContent().pricing;
  const currency = fashionPricing?.currency ?? "USD";
  const locale = fashionPricing?.locale?.trim() || "en-US";
  return {
    mode: "manual",
    defaultCurrency: currency,
    fallbackLocale: locale,
    manualCurrency: currency,
    baseCurrency: currency,
    exchangeRates: { [currency]: 1 },
    showCurrencyCode: true,
    rounding: "auto"
  };
};

const getActivePricingConfig = () => readSitePricing() ?? buildFallbackPricing();

export const getFashionCurrencyCode = (): FashionCurrencyCode => {
  const context = resolveCurrencyContext(getActivePricingConfig());
  return (context.currency as FashionCurrencyCode) ?? "USD";
};

export const getFashionPricingPreferences = (): FashionPricingPreferences => {
  const fallbackLocale =
    typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
  const context = resolveCurrencyContext(getActivePricingConfig());
  return { currency: (context.currency as FashionCurrencyCode) ?? "USD", locale: context.locale || fallbackLocale };
};

export const formatFashionPrice = (
  baseUsdPrice: number,
  options?: FashionCurrencyCode | Partial<FashionPricingPreferences>
) => {
  const preference = getFashionPricingPreferences();
  const currency = typeof options === "string" ? options : options?.currency ?? preference.currency;
  const locale = typeof options === "string" ? preference.locale : options?.locale ?? preference.locale;
  const baseConfig = getActivePricingConfig();
  const overrideConfig: PricingConfig = {
    ...baseConfig,
    mode: "manual",
    manualCurrency: currency,
    fallbackLocale: locale || baseConfig.fallbackLocale
  };
  return formatPriceBadge(baseUsdPrice, overrideConfig);
};
