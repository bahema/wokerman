import { useEffect, useState } from "react";
import type { SiteContent } from "../../data/siteData";
import { getMediaLibrary, type MediaItem } from "../../utils/mediaLibrary";

type HomeUi = NonNullable<SiteContent["homeUi"]>;
type BoxKey = "gadgets" | "ai";
type BoxValue = HomeUi["adsectionMan"]["gadgets"];

type AdsectionManEditorProps = {
  value: HomeUi;
  onSaveSection: (box: BoxKey, next: BoxValue) => Promise<void> | void;
};

const AdsectionManEditor = ({ value, onSaveSection }: AdsectionManEditorProps) => {
  const [draft, setDraft] = useState(value.adsectionMan);
  const [savingBox, setSavingBox] = useState<BoxKey | null>(null);
  const [saveError, setSaveError] = useState<Record<BoxKey, string>>({ gadgets: "", ai: "" });
  const [saveMessage, setSaveMessage] = useState<Record<BoxKey, string>>({ gadgets: "", ai: "" });
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerBox, setImagePickerBox] = useState<BoxKey>("gadgets");
  const [imageSearch, setImageSearch] = useState("");
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    setDraft(value.adsectionMan);
  }, [value]);

  useEffect(() => {
    if (!imagePickerOpen) return;
    let isCancelled = false;
    void (async () => {
      setMediaLoading(true);
      setMediaError("");
      try {
        const media = await getMediaLibrary();
        if (!isCancelled) setMediaLibrary(media);
      } catch {
        if (!isCancelled) setMediaError("Unable to load uploaded images right now.");
      } finally {
        if (!isCancelled) setMediaLoading(false);
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, [imagePickerOpen]);

  const updateBox = (box: BoxKey, field: keyof BoxValue, nextValue: string) => {
    setDraft((prev) => ({
      ...prev,
      [box]: {
        ...prev[box],
        [field]: nextValue
      }
    }));
    setSaveError((prev) => ({ ...prev, [box]: "" }));
    setSaveMessage((prev) => ({ ...prev, [box]: "" }));
  };

  const filteredMedia = mediaLibrary.filter((media) => media.name.toLowerCase().includes(imageSearch.trim().toLowerCase()));

  const validateBox = (box: BoxKey) => {
    const entry = draft[box];
    const requiredFields: Array<
      | "sectionTitle"
      | "imageUrl"
      | "badgePrimary"
      | "badgeSecondary"
      | "overlayTitle"
      | "overlayText"
      | "buttonLabel"
      | "buttonTarget"
      | "scrollHint"
    > = [
      "sectionTitle",
      "imageUrl",
      "badgePrimary",
      "badgeSecondary",
      "overlayTitle",
      "overlayText",
      "buttonLabel",
      "buttonTarget",
      "scrollHint"
    ];
    for (const field of requiredFields) {
      if (!entry[field]?.trim()) return `${field} is required.`;
    }
    return "";
  };

  const saveBox = (box: BoxKey) => {
    const validationError = validateBox(box);
    if (validationError) {
      setSaveError((prev) => ({ ...prev, [box]: validationError }));
      return;
    }
    void (async () => {
      setSavingBox(box);
      setSaveError((prev) => ({ ...prev, [box]: "" }));
      setSaveMessage((prev) => ({ ...prev, [box]: "" }));
      try {
        await onSaveSection(box, draft[box]);
        setSaveMessage((prev) => ({ ...prev, [box]: "Saved and published." }));
      } catch (error) {
        setSaveError((prev) => ({ ...prev, [box]: error instanceof Error ? error.message : "Failed to save this section." }));
      } finally {
        setSavingBox(null);
      }
    })();
  };

  const renderBox = (box: BoxKey, heading: string) => {
    const data = draft[box];
    const isSaving = savingBox === box;
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">{heading}</h4>
          <button
            type="button"
            onClick={() => saveBox(box)}
            disabled={isSaving}
            className="h-9 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
        {saveError[box] ? (
          <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            {saveError[box]}
          </p>
        ) : null}
        {saveMessage[box] ? (
          <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            {saveMessage[box]}
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Section Title</span>
            <input
              value={data.sectionTitle}
              onChange={(e) => updateBox(box, "sectionTitle", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <div className="space-y-1 text-sm">
            <span className="font-medium">Image (from uploads only)</span>
            <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
              <input
                value={data.imageUrl}
                readOnly
                className="h-10 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              />
              <button
                type="button"
                onClick={() => {
                  setImageSearch("");
                  setImagePickerBox(box);
                  setImagePickerOpen(true);
                }}
                className="h-10 rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700"
              >
                Choose Upload
              </button>
            </div>
            {data.imageUrl ? <img src={data.imageUrl} alt={`${heading} selected`} className="h-20 w-20 rounded-md object-cover" /> : null}
          </div>
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
      {imagePickerOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" role="presentation" onClick={() => setImagePickerOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select uploaded image"
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
                        updateBox(imagePickerBox, "imageUrl", media.dataUrl);
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

export default AdsectionManEditor;
