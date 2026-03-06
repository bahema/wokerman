type NavLabels = {
  fashion: string;
  forex: string;
  betting: string;
  software: string;
  social: string;
  health: string;
};

type TopNavLinksEditorProps = {
  value: NavLabels;
  onChange: (next: NavLabels) => void;
};

const labels: Array<{ key: keyof NavLabels; title: string }> = [
  { key: "fashion", title: "Fashion" },
  { key: "forex", title: "Forex" },
  { key: "betting", title: "Betting" },
  { key: "software", title: "Software" },
  { key: "social", title: "Social" },
  { key: "health", title: "Health" }
];

const TopNavLinksEditor = ({ value, onChange }: TopNavLinksEditorProps) => (
  <div className="space-y-4">
    <p className="text-sm text-slate-600 dark:text-slate-300">
      Edit the main website top-navbar labels.
    </p>
    <div className="grid gap-3 md:grid-cols-2">
      {labels.map((item) => (
        <label key={item.key} className="space-y-1 text-sm">
          <span className="font-medium">{item.title} label</span>
          <input
            value={value[item.key]}
            onChange={(event) => onChange({ ...value, [item.key]: event.target.value })}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      ))}
    </div>
  </div>
);

export default TopNavLinksEditor;
