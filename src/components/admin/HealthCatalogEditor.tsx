import type { HealthCatalogItem } from "../../data/siteData";

type HealthCatalogEditorProps = {
  title: string;
  sectionTitle: string;
  sectionDescription: string;
  items: HealthCatalogItem[];
  onSectionTitleChange: (value: string) => void;
  onSectionDescriptionChange: (value: string) => void;
  onChange: (next: HealthCatalogItem[]) => void;
};

const makeId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `health-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const HealthCatalogEditor = ({
  title,
  sectionTitle,
  sectionDescription,
  items,
  onSectionTitleChange,
  onSectionDescriptionChange,
  onChange
}: HealthCatalogEditorProps) => (
  <div className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">{title} Section Copy</h4>
      <div className="mt-3 grid gap-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Section Title</span>
          <input
            value={sectionTitle}
            onChange={(event) => onSectionTitleChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Section Description</span>
          <textarea
            value={sectionDescription}
            onChange={(event) => onSectionDescriptionChange(event.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">{title} Products</h4>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              {
                id: makeId(),
                title: "",
                description: "",
                priceLabel: "",
                badge: "",
                imageUrl: "",
                link: ""
              }
            ])
          }
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
        >
          Add Product
        </button>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id || `item-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title} Product #{index + 1}</p>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-600 dark:border-rose-800 dark:text-rose-300"
              >
                Delete
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Title</span>
                <input
                  value={item.title}
                  onChange={(event) =>
                    onChange(items.map((entry, i) => (i === index ? { ...entry, title: event.target.value } : entry)))
                  }
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Price Label</span>
                <input
                  value={item.priceLabel}
                  onChange={(event) =>
                    onChange(items.map((entry, i) => (i === index ? { ...entry, priceLabel: event.target.value } : entry)))
                  }
                  placeholder="$49"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Badge</span>
                <input
                  value={item.badge ?? ""}
                  onChange={(event) =>
                    onChange(items.map((entry, i) => (i === index ? { ...entry, badge: event.target.value } : entry)))
                  }
                  placeholder="Top Pick"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Image URL</span>
                <input
                  value={item.imageUrl ?? ""}
                  onChange={(event) =>
                    onChange(items.map((entry, i) => (i === index ? { ...entry, imageUrl: event.target.value } : entry)))
                  }
                  placeholder="https://..."
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium">Description</span>
                <textarea
                  value={item.description}
                  onChange={(event) =>
                    onChange(items.map((entry, i) => (i === index ? { ...entry, description: event.target.value } : entry)))
                  }
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium">Product Link</span>
                <input
                  value={item.link ?? ""}
                  onChange={(event) =>
                    onChange(items.map((entry, i) => (i === index ? { ...entry, link: event.target.value } : entry)))
                  }
                  placeholder="https://..."
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
            No products yet. Use "Add Product" to create the first item.
          </p>
        ) : null}
      </div>
    </div>
  </div>
);

export default HealthCatalogEditor;
