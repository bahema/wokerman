import { useEffect, useState } from "react";
import { makeId } from "../../utils/ids";
import { getMediaLibrary, type MediaItem } from "../../utils/mediaLibrary";
import ConfirmDialog from "./ConfirmDialog";
import Drawer from "./Drawer";

export type IndustryItem = { id: string; label: string; icon?: string; imageUrl?: string; link?: string };

type IndustryManagerProps = {
  items: IndustryItem[];
  onChange: (next: IndustryItem[]) => void;
};

const emptyItem = (): IndustryItem => ({ id: makeId("ind"), label: "", icon: "" });

const deriveIndustryLabel = (item: IndustryItem) => {
  const link = item.link?.trim() ?? "";
  if (link) {
    try {
      const host = new URL(link).hostname.replace(/^www\./i, "");
      if (host) return host;
    } catch {
      // fall through
    }
  }
  return item.label?.trim() || "Industry";
};

const IndustryManager = ({ items, onChange }: IndustryManagerProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftItem, setDraftItem] = useState<IndustryItem>(emptyItem());
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState("");
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [formError, setFormError] = useState("");
  const filteredMedia = mediaLibrary.filter((media) => media.name.toLowerCase().includes(imageSearch.trim().toLowerCase()));

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

  const validateDraftItem = (item: IndustryItem) => {
    if (!item.imageUrl?.trim()) return "Industry icon/image is required.";
    if (item.link?.trim()) {
      try {
        const parsed = new URL(item.link.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return "Industry link must be a valid http(s) URL.";
        }
      } catch {
        return "Industry link must be a valid http(s) URL.";
      }
    } else {
      return "Industry link is required.";
    }
    return "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Industries</h3>
        <button
          type="button"
          onClick={() => {
            setEditingIndex(null);
            setDraftItem(emptyItem());
            setFormError("");
            setDrawerOpen(true);
          }}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          Add Industry
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[minmax(0,1.5fr),minmax(0,1fr),minmax(0,1fr)]"
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex === null || dragIndex === index) return;
              const next = [...items];
              const [moved] = next.splice(dragIndex, 1);
              next.splice(index, 0, moved);
              onChange(next);
              setDragIndex(null);
            }}
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.label} className="h-10 w-10 rounded-md object-cover" /> : <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-200 text-sm font-semibold dark:bg-slate-800">{item.icon ?? "•"}</span>}
                <div>
                  <p className="font-semibold">{deriveIndustryLabel(item)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.link?.trim() ? "Link configured" : "No link yet"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Metadata</p>
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 dark:bg-slate-800">industry</span>
                {item.imageUrl ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">has image</span> : null}
                {item.link?.trim() ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">has link</span> : null}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(index);
                  setDraftItem(item);
                  setFormError("");
                  setDrawerOpen(true);
                }}
                className="h-9 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onChange([...items.slice(0, index + 1), { ...item, id: makeId("ind"), label: `${item.label} Copy` }, ...items.slice(index + 1)])}
                className="h-9 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700"
              >
                Duplicate
              </button>
              <button type="button" onClick={() => setDeleteIndex(index)} className="h-9 rounded-lg border border-rose-300 px-2 py-1 text-rose-600 dark:border-rose-700 dark:text-rose-300">
                Delete
              </button>
              <span className="flex h-9 cursor-grab items-center justify-center rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700">Drag</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Drawer title={editingIndex === null ? "Add Industry" : "Edit Industry"} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="space-y-3">
          {formError ? (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {formError}
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span>Industry Icon / Image URL</span>
            <input
              value={draftItem.imageUrl ?? ""}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, imageUrl: event.target.value }))}
              placeholder="https://example.com/industry-image.jpg"
              className="h-10 w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Industry Link</span>
            <input
              value={draftItem.link ?? ""}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, link: event.target.value }))}
              placeholder="https://othercompany.com/page"
              className="h-10 w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setImageSearch("");
              setImagePickerOpen(true);
            }}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700"
          >
            Choose from Uploaded Images
          </button>
          {draftItem.imageUrl ? <img src={draftItem.imageUrl} alt="Industry preview" className="h-20 w-20 rounded-md object-cover" /> : null}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const validationError = validateDraftItem(draftItem);
                if (validationError) {
                  setFormError(validationError);
                  return;
                }
                const normalizedItem = {
                  ...draftItem,
                  label: deriveIndustryLabel(draftItem),
                  icon: "",
                  imageUrl: draftItem.imageUrl?.trim() ?? "",
                  link: draftItem.link?.trim() ?? ""
                };
                if (editingIndex === null) onChange([...items, normalizedItem]);
                else onChange(items.map((item, index) => (index === editingIndex ? normalizedItem : item)));
                setFormError("");
                setDrawerOpen(false);
              }}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={deleteIndex !== null}
        title="Delete industry?"
        message="This action cannot be undone."
        onCancel={() => setDeleteIndex(null)}
        onConfirm={() => {
          if (deleteIndex === null) return;
          onChange(items.filter((_, index) => index !== deleteIndex));
          setDeleteIndex(null);
        }}
      />

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
                        setDraftItem((prev) => ({ ...prev, imageUrl: media.dataUrl }));
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

export default IndustryManager;
