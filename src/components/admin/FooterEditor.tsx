import type { SiteContent } from "../../data/siteData";

type FooterEditorProps = {
  value: SiteContent["footer"];
  onChange: (next: SiteContent["footer"]) => void;
};

const FooterEditor = ({ value, onChange }: FooterEditorProps) => (
  <div className="grid gap-4">
    <label className="space-y-1 text-sm">
      <span className="font-medium">Footer note</span>
      <textarea
        value={value.note}
        onChange={(event) => onChange({ ...value, note: event.target.value })}
        rows={3}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
    <label className="space-y-1 text-sm">
      <span className="font-medium">Copyright</span>
      <input
        value={value.copyright}
        onChange={(event) => onChange({ ...value, copyright: event.target.value })}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  </div>
);

export default FooterEditor;
