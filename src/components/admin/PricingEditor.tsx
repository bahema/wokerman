import type { PricingConfig } from "../../../shared/siteTypes";

type PricingEditorProps = {
  value: PricingConfig;
  onChange: (next: PricingConfig) => void;
};

const normalizeCurrency = (value: string) => value.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);

const PricingEditor = ({ value, onChange }: PricingEditorProps) => {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Pricing & Currency</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Configure whether product price badges follow user location automatically or use a fixed currency.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Mode</span>
          <select
            value={value.mode}
            onChange={(event) => onChange({ ...value, mode: event.target.value as PricingConfig["mode"] })}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="auto">Auto by location</option>
            <option value="manual">Manual fixed currency</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Default Currency (ISO code)</span>
          <input
            value={value.defaultCurrency}
            onChange={(event) => onChange({ ...value, defaultCurrency: normalizeCurrency(event.target.value) || "USD" })}
            placeholder="USD"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 uppercase dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Fallback Locale</span>
          <input
            value={value.fallbackLocale}
            onChange={(event) => onChange({ ...value, fallbackLocale: event.target.value.trim() || "en-US" })}
            placeholder="en-US"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Manual Currency (used in manual mode)</span>
          <input
            value={value.manualCurrency ?? ""}
            onChange={(event) => onChange({ ...value, manualCurrency: normalizeCurrency(event.target.value) || "USD" })}
            placeholder="USD"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 uppercase dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      </div>
    </div>
  );
};

export default PricingEditor;
