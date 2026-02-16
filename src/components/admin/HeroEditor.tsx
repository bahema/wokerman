import type { SiteContent } from "../../data/siteData";

type HeroEditorProps = {
  value: SiteContent["hero"];
  onChange: (next: SiteContent["hero"]) => void;
};

const HeroEditor = ({ value, onChange }: HeroEditorProps) => (
  <div className="space-y-4">
    <label className="block space-y-1 text-sm">
      <span className="font-medium">Headline</span>
      <textarea
        value={value.headline}
        onChange={(event) => onChange({ ...value, headline: event.target.value })}
        rows={2}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
    <label className="block space-y-1 text-sm">
      <span className="font-medium">Subtext</span>
      <textarea
        value={value.subtext}
        onChange={(event) => onChange({ ...value, subtext: event.target.value })}
        rows={3}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span className="font-medium">Primary CTA Label</span>
        <input
          value={value.ctaPrimary.label}
          onChange={(event) => onChange({ ...value, ctaPrimary: { ...value.ctaPrimary, label: event.target.value } })}
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Primary CTA Target</span>
        <input
          value={value.ctaPrimary.target}
          onChange={(event) => onChange({ ...value, ctaPrimary: { ...value.ctaPrimary, target: event.target.value } })}
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Secondary CTA Label</span>
        <input
          value={value.ctaSecondary.label}
          onChange={(event) => onChange({ ...value, ctaSecondary: { ...value.ctaSecondary, label: event.target.value } })}
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Secondary CTA Target</span>
        <input
          value={value.ctaSecondary.target}
          onChange={(event) => onChange({ ...value, ctaSecondary: { ...value.ctaSecondary, target: event.target.value } })}
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
    </div>
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Stats</h4>
        <button
          type="button"
          onClick={() => onChange({ ...value, stats: [...value.stats, { label: "", value: "" }] })}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
        >
          Add Stat
        </button>
      </div>
      <div className="space-y-2">
        {value.stats.map((stat, index) => (
          <div key={`stat-${index}`} className="grid gap-2 md:grid-cols-[1fr,1fr,auto]">
            <input
              value={stat.label}
              placeholder="Label"
              onChange={(event) =>
                onChange({
                  ...value,
                  stats: value.stats.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry))
                })
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              value={stat.value}
              placeholder="Value"
              onChange={(event) =>
                onChange({
                  ...value,
                  stats: value.stats.map((entry, i) => (i === index ? { ...entry, value: event.target.value } : entry))
                })
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              type="button"
              onClick={() => onChange({ ...value, stats: value.stats.filter((_, i) => i !== index) })}
              className="rounded-xl border border-rose-300 px-3 py-2 text-sm text-rose-600 dark:border-rose-700 dark:text-rose-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default HeroEditor;
