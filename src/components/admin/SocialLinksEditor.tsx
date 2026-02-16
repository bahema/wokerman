import { useMemo } from "react";
import type { SiteContent } from "../../data/siteData";

type SocialLinksEditorProps = {
  value: SiteContent["socials"];
  onChange: (next: SiteContent["socials"]) => void;
};

const SocialLinksEditor = ({ value, onChange }: SocialLinksEditorProps) => {
  const isValidUrl = (input: string) => {
    try {
      const parsed = new URL(input.trim());
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!value.facebookUrl.trim() || !isValidUrl(value.facebookUrl)) issues.push("Facebook URL must be a valid http(s) URL.");
    if (!value.whatsappUrl.trim() || !isValidUrl(value.whatsappUrl)) issues.push("WhatsApp URL must be a valid http(s) URL.");
    (value.other ?? []).forEach((item, index) => {
      if (!item.name.trim()) issues.push(`Other social #${index + 1}: Name is required.`);
      if (!item.url.trim() || !isValidUrl(item.url)) issues.push(`Other social #${index + 1}: URL must be a valid http(s) URL.`);
    });
    return issues;
  }, [value]);

  return (
    <div className="space-y-4">
      {validationIssues.length ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          {validationIssues[0]}
        </div>
      ) : null}
    <label className="block space-y-1 text-sm">
      <span className="font-medium">Facebook URL</span>
      <input
        value={value.facebookUrl}
        onChange={(event) => onChange({ ...value, facebookUrl: event.target.value })}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
    <label className="block space-y-1 text-sm">
      <span className="font-medium">WhatsApp URL</span>
      <input
        value={value.whatsappUrl}
        onChange={(event) => onChange({ ...value, whatsappUrl: event.target.value })}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Other socials</h4>
        <button
          type="button"
          onClick={() => onChange({ ...value, other: [...(value.other ?? []), { name: "", url: "" }] })}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
        >
          Add Social
        </button>
      </div>
      <div className="space-y-2">
        {(value.other ?? []).map((item, index) => (
          <div key={`social-${index}`} className="grid gap-2 md:grid-cols-[1fr,1fr,auto]">
            <input
              value={item.name}
              placeholder="Name"
              onChange={(event) =>
                onChange({
                  ...value,
                  other: (value.other ?? []).map((entry, i) => (i === index ? { ...entry, name: event.target.value } : entry))
                })
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              value={item.url}
              placeholder="URL"
              onChange={(event) =>
                onChange({
                  ...value,
                  other: (value.other ?? []).map((entry, i) => (i === index ? { ...entry, url: event.target.value } : entry))
                })
              }
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              type="button"
              onClick={() => onChange({ ...value, other: (value.other ?? []).filter((_, i) => i !== index) })}
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
};

export default SocialLinksEditor;
