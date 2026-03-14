import type { PricingConfig } from "../../../shared/siteTypes";
import { formatPriceBadge } from "../../utils/pricing";

type PriceSystemEditorProps = {
  value: PricingConfig;
  onChange: (next: PricingConfig) => void;
};

const currencyOptions = ["USD", "EUR", "GBP", "RWF"] as const;

const normalizeCurrency = (value: string) => value.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || "USD";

const normalizeRateValue = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const PriceSystemEditor = ({ value, onChange }: PriceSystemEditorProps) => {
  const baseCurrency = normalizeCurrency(value.baseCurrency ?? value.defaultCurrency ?? "USD");
  const manualCurrency = normalizeCurrency(value.manualCurrency ?? value.defaultCurrency ?? "USD");
  const rateMap = value.exchangeRates ?? {};

  const updateRate = (code: string, raw: string) => {
    const rate = normalizeRateValue(raw);
    const nextRates = { ...rateMap };
    if (rate === null) {
      delete nextRates[code];
    } else {
      nextRates[code] = rate;
    }
    onChange({ ...value, exchangeRates: nextRates });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Price System</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Set the base currency used in product prices, choose the display currency, and define exchange rates.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Base currency (price input)</span>
          <select
            value={baseCurrency}
            onChange={(event) => {
              const nextBase = normalizeCurrency(event.target.value);
              const nextRates = { ...rateMap };
              if (!nextRates[nextBase]) {
                nextRates[nextBase] = 1;
              }
              onChange({
                ...value,
                baseCurrency: nextBase,
                defaultCurrency: nextBase,
                exchangeRates: nextRates
              });
            }}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          >
            {currencyOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Display currency</span>
          <select
            value={manualCurrency}
            onChange={(event) =>
              onChange({
                ...value,
                mode: "manual",
                manualCurrency: normalizeCurrency(event.target.value)
              })
            }
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          >
            {currencyOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Locale</span>
          <input
            value={value.fallbackLocale ?? "en-US"}
            onChange={(event) => onChange({ ...value, fallbackLocale: event.target.value.trim() || "en-US" })}
            placeholder="en-US"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Rounding</span>
          <select
            value={value.rounding ?? "auto"}
            onChange={(event) => onChange({ ...value, rounding: event.target.value as PricingConfig["rounding"] })}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="auto">Auto</option>
            <option value="integer">No decimals</option>
            <option value="two-decimal">Two decimals</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.showCurrencyCode ?? true}
            onChange={(event) => onChange({ ...value, showCurrencyCode: event.target.checked })}
          />
          Show currency code instead of symbol
        </label>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Example: {formatPriceBadge(149, value)}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="text-sm font-semibold">Exchange Rates (1 {baseCurrency} = ?)</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {currencyOptions.map((code) => (
            <label key={code} className="space-y-1 text-sm">
              <span>{code}</span>
              <input
                value={rateMap[code] ?? (code === baseCurrency ? 1 : "")}
                onChange={(event) => updateRate(code, event.target.value)}
                placeholder={code === baseCurrency ? "1" : ""}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Example: if base is USD and RWF is 1325, then 10 USD displays as {formatPriceBadge(10, value)}.
        </p>
      </div>
    </div>
  );
};

export default PriceSystemEditor;
