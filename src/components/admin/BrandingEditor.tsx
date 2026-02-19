import type { AdminThemePreference, SiteContent, SiteEventTheme } from "../../data/siteData";

type BrandingEditorProps = {
  value: SiteContent["branding"];
  onChange: (next: SiteContent["branding"]) => void;
};

const BrandingEditor = ({ value, onChange }: BrandingEditorProps) => (
  <div className="grid gap-4 md:grid-cols-2">
    <label className="space-y-1 text-sm">
      <span className="font-medium">Logo text</span>
      <input
        value={value.logoText}
        onChange={(event) => onChange({ ...value, logoText: event.target.value })}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
    <label className="space-y-1 text-sm">
      <span className="font-medium">Accent color</span>
      <div className="flex gap-2">
        <input
          type="color"
          value={value.accentColor ?? "#2563eb"}
          onChange={(event) => onChange({ ...value, accentColor: event.target.value })}
          className="h-10 w-14 rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950"
        />
        <input
          value={value.accentColor ?? "#2563eb"}
          onChange={(event) => onChange({ ...value, accentColor: event.target.value })}
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
        />
      </div>
    </label>
    <label className="space-y-1 text-sm">
      <span className="font-medium">Default theme</span>
      <select
        value={value.defaultTheme ?? "system"}
        onChange={(event) => onChange({ ...value, defaultTheme: event.target.value as AdminThemePreference })}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    <label className="space-y-1 text-sm">
      <span className="font-medium">Event theme</span>
      <select
        value={value.eventTheme ?? "none"}
        onChange={(event) => onChange({ ...value, eventTheme: event.target.value as SiteEventTheme })}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
      >
        <option value="none">None</option>
        <option value="christmas">Christmas</option>
        <option value="new-year">New Year</option>
        <option value="valentine">Valentine</option>
        <option value="easter">Easter</option>
        <option value="ramadan">Ramadan</option>
        <option value="eid">Eid</option>
      </select>
    </label>
  </div>
);

export default BrandingEditor;
