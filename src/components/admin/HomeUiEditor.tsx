import type { SiteContent } from "../../data/siteData";

type HomeUiEditorProps = {
  value: NonNullable<SiteContent["homeUi"]>;
  onChange: (next: NonNullable<SiteContent["homeUi"]>) => void;
};

const HomeUiEditor = ({ value, onChange }: HomeUiEditorProps) => (
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Home UI Copy</h4>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span className="font-medium">Hero Eyebrow</span>
        <input value={value.heroEyebrow} onChange={(e) => onChange({ ...value, heroEyebrow: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Quick Grabs Button</span>
        <input value={value.heroQuickGrabsLabel} onChange={(e) => onChange({ ...value, heroQuickGrabsLabel: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Snapshot Title</span>
        <input value={value.performanceSnapshotTitle} onChange={(e) => onChange({ ...value, performanceSnapshotTitle: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Industries Heading</span>
        <input value={value.industriesHeading} onChange={(e) => onChange({ ...value, industriesHeading: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="font-medium">Snapshot Subtext</span>
        <textarea value={value.performanceSnapshotSubtext} onChange={(e) => onChange({ ...value, performanceSnapshotSubtext: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="font-medium">Industries Empty Message</span>
        <textarea value={value.industriesEmptyMessage} onChange={(e) => onChange({ ...value, industriesEmptyMessage: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
      </label>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span className="font-medium">Product NEW Badge</span>
        <input value={value.productCardNewBadgeLabel} onChange={(e) => onChange({ ...value, productCardNewBadgeLabel: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Product New Release Label</span>
        <input value={value.productCardNewReleaseLabel} onChange={(e) => onChange({ ...value, productCardNewReleaseLabel: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Product Key Features Suffix</span>
        <input value={value.productCardKeyFeaturesSuffix} onChange={(e) => onChange({ ...value, productCardKeyFeaturesSuffix: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Checkout Button Label</span>
        <input value={value.productCardCheckoutLabel} onChange={(e) => onChange({ ...value, productCardCheckoutLabel: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">More Info Button Label</span>
        <input value={value.productCardMoreInfoLabel} onChange={(e) => onChange({ ...value, productCardMoreInfoLabel: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="font-medium">Product Affiliate Disclosure</span>
        <textarea value={value.productCardAffiliateDisclosure} onChange={(e) => onChange({ ...value, productCardAffiliateDisclosure: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
      </label>
    </div>
  </div>
);

export default HomeUiEditor;
