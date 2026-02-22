import type { SiteContent } from "../../data/siteData";

type Hero2EditorProps = {
  value: NonNullable<SiteContent["healthPage"]>["hero2"];
  onChange: (next: NonNullable<SiteContent["healthPage"]>["hero2"]) => void;
};

const Hero2Editor = ({ value, onChange }: Hero2EditorProps) => (
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Hero 2</h4>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="font-medium">Eyebrow</span>
        <input
          value={value.eyebrow}
          onChange={(event) => onChange({ ...value, eyebrow: event.target.value })}
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="font-medium">Headline</span>
        <textarea
          value={value.headline}
          onChange={(event) => onChange({ ...value, headline: event.target.value })}
          rows={2}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="font-medium">Subtext</span>
        <textarea
          value={value.subtext}
          onChange={(event) => onChange({ ...value, subtext: event.target.value })}
          rows={3}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
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
  </div>
);

export default Hero2Editor;
