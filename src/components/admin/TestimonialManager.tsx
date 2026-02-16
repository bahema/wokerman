import { useEffect, useState } from "react";
import { makeId } from "../../utils/ids";
import { getMediaLibrary, type MediaItem } from "../../utils/mediaLibrary";
import ConfirmDialog from "./ConfirmDialog";
import Drawer from "./Drawer";

export type TestimonialItem = { id: string; name: string; role: string; rating: number; quote: string; avatarUrl?: string };

type TestimonialManagerProps = {
  items: TestimonialItem[];
  onChange: (next: TestimonialItem[]) => void;
};

const emptyItem = (): TestimonialItem => ({ id: makeId("t"), name: "", role: "", rating: 5, quote: "", avatarUrl: "" });

const TestimonialManager = ({ items, onChange }: TestimonialManagerProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftItem, setDraftItem] = useState<TestimonialItem>(emptyItem());
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

  const openAdd = () => {
    setEditingIndex(null);
    setDraftItem(emptyItem());
    setFormError("");
    setDrawerOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setDraftItem(items[index]);
    setFormError("");
    setDrawerOpen(true);
  };

  const validateDraftItem = (item: TestimonialItem) => {
    if (!item.name.trim()) return "Name is required.";
    if (!item.role.trim()) return "Role is required.";
    if (!item.quote.trim()) return "Quote is required.";
    if (!Number.isFinite(item.rating) || item.rating < 1 || item.rating > 5) return "Rating must be between 1 and 5.";
    return "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Testimonials</h3>
        <button type="button" onClick={openAdd} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white">
          Add Testimonial
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
                {item.avatarUrl ? <img src={item.avatarUrl} alt={item.name} className="h-10 w-10 rounded-full object-cover" /> : <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold dark:bg-slate-800">{item.name.charAt(0)}</span>}
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.role || "Client"}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.quote}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Metadata</p>
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium dark:bg-slate-800">rating {item.rating}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 dark:bg-slate-800">testimonial</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
              <button type="button" onClick={() => openEdit(index)} className="h-9 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700">
                Edit
              </button>
              <button
                type="button"
                onClick={() => onChange([...items.slice(0, index + 1), { ...item, id: makeId("t"), name: `${item.name} Copy` }, ...items.slice(index + 1)])}
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

      <Drawer title={editingIndex === null ? "Add Testimonial" : "Edit Testimonial"} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="space-y-3">
          {formError ? (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {formError}
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span>Name</span>
            <input
              value={draftItem.name}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, name: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Role</span>
            <input
              value={draftItem.role}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, role: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Rating</span>
            <input
              type="number"
              min={1}
              max={5}
              value={draftItem.rating}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, rating: Number(event.target.value) }))}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Quote</span>
            <textarea
              rows={4}
              value={draftItem.quote}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, quote: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Avatar URL</span>
            <input
              value={draftItem.avatarUrl ?? ""}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, avatarUrl: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <div>
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
          </div>
          {draftItem.avatarUrl ? (
            <img src={draftItem.avatarUrl} alt="Testimonial avatar preview" className="h-20 w-20 rounded-full object-cover" />
          ) : null}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const validationError = validateDraftItem(draftItem);
                if (validationError) {
                  setFormError(validationError);
                  return;
                }
                if (editingIndex === null) {
                  onChange([...items, { ...draftItem, id: draftItem.id || makeId("t"), name: draftItem.name.trim(), role: draftItem.role.trim(), quote: draftItem.quote.trim() }]);
                } else {
                  onChange(
                    items.map((item, index) =>
                      index === editingIndex ? { ...draftItem, name: draftItem.name.trim(), role: draftItem.role.trim(), quote: draftItem.quote.trim() } : item
                    )
                  );
                }
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
        title="Delete testimonial?"
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
                        setDraftItem((prev) => ({ ...prev, avatarUrl: media.dataUrl }));
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

export default TestimonialManager;
