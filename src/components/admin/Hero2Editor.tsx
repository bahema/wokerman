import { useEffect, useState } from "react";
import type { SiteContent } from "../../data/siteData";
import { getMediaLibrary, type MediaItem } from "../../utils/mediaLibrary";

type Hero2EditorProps = {
  value: NonNullable<SiteContent["healthPage"]>["hero2"];
  onChange: (next: NonNullable<SiteContent["healthPage"]>["hero2"]) => void;
};

const Hero2Editor = ({ value, onChange }: Hero2EditorProps) => {
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState("");
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const filteredMedia = mediaLibrary.filter((media) => media.name.toLowerCase().includes(imageSearch.trim().toLowerCase()));

  useEffect(() => {
    if (!imagePickerOpen) return;
    let cancelled = false;
    void (async () => {
      setMediaLoading(true);
      setMediaError("");
      try {
        const media = await getMediaLibrary();
        if (!cancelled) setMediaLibrary(media);
      } catch (error) {
        if (!cancelled) setMediaError(error instanceof Error ? error.message : "Unable to load uploaded images.");
      } finally {
        if (!cancelled) setMediaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imagePickerOpen]);

  return (
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
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="font-medium">Hero Image</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={value.imageUrl}
            readOnly
            placeholder="Select from uploaded images"
            className="h-10 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          />
          <button
            type="button"
            onClick={() => {
              setImageSearch("");
              setImagePickerOpen(true);
            }}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700"
          >
            Grab Image
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, imageUrl: "", imageAlt: "" })}
            className="h-10 rounded-xl border border-rose-300 px-3 text-sm text-rose-600 dark:border-rose-700 dark:text-rose-300"
          >
            Clear
          </button>
        </div>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Hero Image Alt Text</span>
        <input
          value={value.imageAlt}
          onChange={(event) => onChange({ ...value, imageAlt: event.target.value })}
          placeholder="Describe the hero image"
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Hero Image Link</span>
        <input
          value={value.imageLink}
          onChange={(event) => onChange({ ...value, imageLink: event.target.value })}
          placeholder="https://product-link..."
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
        />
      </label>
      {value.imageUrl ? (
        <div className="md:col-span-2">
          <img src={value.imageUrl} alt={value.imageAlt || "Hero 2 preview"} className="h-44 w-full rounded-2xl object-cover" />
        </div>
      ) : null}
    </div>
      {imagePickerOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" role="presentation" onClick={() => setImagePickerOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select uploaded hero image"
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
            <h4 className="text-base font-semibold">Uploaded Images</h4>
              <button type="button" onClick={() => setImagePickerOpen(false)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700">
                Close
              </button>
            </div>
            <input
              value={imageSearch}
              onChange={(event) => setImageSearch(event.target.value)}
              placeholder="Search image by name..."
              className="mb-3 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-800">
              {mediaLoading ? (
                <p className="p-2 text-sm text-slate-500 dark:text-slate-400">Loading uploaded images...</p>
              ) : mediaError ? (
                <p className="rounded-lg border border-rose-300 bg-rose-50 p-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                  {mediaError}
                </p>
              ) : filteredMedia.length === 0 ? (
                <p className="p-2 text-sm text-slate-500 dark:text-slate-400">No images found.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredMedia.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => {
                        onChange({ ...value, imageUrl: media.dataUrl, imageAlt: value.imageAlt || media.name });
                        setImagePickerOpen(false);
                      }}
                      className="overflow-hidden rounded-xl border border-slate-200 text-left transition hover:border-blue-500 dark:border-slate-700"
                    >
                      <img src={media.dataUrl} alt={media.name} className="h-24 w-full object-cover" />
                      <p className="truncate px-2 py-1 text-xs">{media.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Hero2Editor;
