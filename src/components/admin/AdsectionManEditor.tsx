import type { SiteContent } from "../../data/siteData";

type HomeUi = NonNullable<SiteContent["homeUi"]>;
type BoxKey = "gadgets" | "ai";

type AdsectionManEditorProps = {
  value: HomeUi;
  onChange: (next: HomeUi) => void;
};

const AdsectionManEditor = ({ value, onChange }: AdsectionManEditorProps) => {
  const updateBox = (box: BoxKey, field: keyof HomeUi["adsectionMan"]["gadgets"], nextValue: string) => {
    onChange({
      ...value,
      adsectionMan: {
        ...value.adsectionMan,
        [box]: {
          ...value.adsectionMan[box],
          [field]: nextValue
        }
      }
    });
  };

  const renderBox = (box: BoxKey, heading: string) => {
    const data = value.adsectionMan[box];
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">{heading}</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Section Title</span>
            <input
              value={data.sectionTitle}
              onChange={(e) => updateBox(box, "sectionTitle", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Image URL</span>
            <input
              value={data.imageUrl}
              onChange={(e) => updateBox(box, "imageUrl", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Badge Primary</span>
            <input
              value={data.badgePrimary}
              onChange={(e) => updateBox(box, "badgePrimary", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Badge Secondary</span>
            <input
              value={data.badgeSecondary}
              onChange={(e) => updateBox(box, "badgeSecondary", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Overlay Title</span>
            <input
              value={data.overlayTitle}
              onChange={(e) => updateBox(box, "overlayTitle", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Button Label</span>
            <input
              value={data.buttonLabel}
              onChange={(e) => updateBox(box, "buttonLabel", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Button Link / Target</span>
            <input
              value={data.buttonTarget}
              onChange={(e) => updateBox(box, "buttonTarget", e.target.value)}
              placeholder="https://... or forex/software/social"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Scroll Hint Label</span>
            <input
              value={data.scrollHint}
              onChange={(e) => updateBox(box, "scrollHint", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Overlay Description</span>
            <textarea
              value={data.overlayText}
              onChange={(e) => updateBox(box, "overlayText", e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderBox("gadgets", "Top Hero Ad Box (Newer Gadgets)")}
      {renderBox("ai", "Bottom Hero Ad Box (AI Update)")}
    </div>
  );
};

export default AdsectionManEditor;
