import { useEffect, useState } from "react";
import type { HealthUpcomingItem } from "../../../shared/siteTypes";
import { makeId } from "../../utils/ids";
import { getMediaLibrary, type MediaItem } from "../../utils/mediaLibrary";
import ConfirmDialog from "./ConfirmDialog";
import Drawer from "./Drawer";

type HealthUpcomingManagerProps = {
  title: string;
  sectionTitle: string;
  sectionSubtitle: string;
  items: HealthUpcomingItem[];
  onSectionCopySave: (next: { title: string; subtitle: string }) => Promise<void> | void;
  onChange: (next: HealthUpcomingItem[]) => void;
  onPreviewDraft: (nextItems: HealthUpcomingItem[]) => void;
  onSaveAndPublish?: (nextItems: HealthUpcomingItem[]) => Promise<void> | void;
};

const createNewUpcoming = (): HealthUpcomingItem => ({
  id: makeId("upcoming"),
  position: 1,
  title: "",
  shortDescription: "",
  imageUrl: "",
  launchDate: "",
  badge: "Soon",
  active: true,
  notifyLabel: "Notify me"
});

const normalizePosition = (value: unknown, fallback: number) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.round(numeric));
};

const getNextPosition = (items: HealthUpcomingItem[]) =>
  items.reduce((max, item) => Math.max(max, normalizePosition(item.position, 0)), 0) + 1;

const HealthUpcomingManager = ({
  title,
  sectionTitle,
  sectionSubtitle,
  items,
  onSectionCopySave,
  onChange,
  onPreviewDraft,
  onSaveAndPublish
}: HealthUpcomingManagerProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftItem, setDraftItem] = useState<HealthUpcomingItem>(createNewUpcoming());
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState("");
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sectionCopyError, setSectionCopyError] = useState("");
  const [sectionCopySaving, setSectionCopySaving] = useState(false);
  const [sectionCopyDraft, setSectionCopyDraft] = useState({ title: sectionTitle, subtitle: sectionSubtitle });

  const filteredMedia = mediaLibrary.filter((media) => media.name.toLowerCase().includes(imageSearch.trim().toLowerCase()));

  useEffect(() => {
    setSectionCopyDraft({ title: sectionTitle, subtitle: sectionSubtitle });
  }, [sectionSubtitle, sectionTitle]);

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

  const persistList = async (nextItems: HealthUpcomingItem[]) => {
    onChange(nextItems);
    if (onSaveAndPublish) await onSaveAndPublish(nextItems);
  };

  const openAdd = () => {
    setEditingIndex(null);
    setDraftItem({ ...createNewUpcoming(), position: getNextPosition(items) });
    setFormError("");
    setDrawerOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    const source = items[index];
    setDraftItem({ ...source, position: normalizePosition(source.position, index + 1) });
    setFormError("");
    setDrawerOpen(true);
  };

  const validateDraft = (item: HealthUpcomingItem) => {
    if (!item.title.trim()) return "Title is required.";
    if (!item.shortDescription.trim()) return "Short description is required.";
    if (!item.imageUrl.trim()) return "Image is required. Use Grab Image from uploads.";
    if (item.launchDate?.trim()) {
      const parsed = new Date(item.launchDate);
      if (Number.isNaN(parsed.getTime())) return "Launch date must be a valid date.";
    }
    if (!item.notifyLabel?.trim()) return "Notify button label is required.";
    return "";
  };

  const saveItem = () => {
    const validationError = validateDraft(draftItem);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const normalized = {
      ...draftItem,
      title: draftItem.title.trim(),
      shortDescription: draftItem.shortDescription.trim(),
      badge: draftItem.badge?.trim() ?? "",
      launchDate: draftItem.launchDate?.trim() ?? "",
      notifyLabel: draftItem.notifyLabel?.trim() ?? "Notify me",
      position: normalizePosition(draftItem.position, editingIndex !== null ? editingIndex + 1 : getNextPosition(items))
    };
    const nextItems =
      editingIndex !== null
        ? items.map((item, index) => (index === editingIndex ? normalized : { ...item, position: normalizePosition(item.position, index + 1) }))
        : [...items.map((item, index) => ({ ...item, position: normalizePosition(item.position, index + 1) })), normalized];
    void (async () => {
      setSaving(true);
      try {
        await persistList(nextItems);
        setFormError("");
        setDrawerOpen(false);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Failed to save upcoming item.");
      } finally {
        setSaving(false);
      }
    })();
  };

  const previewItem = () => {
    const validationError = validateDraft(draftItem);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const normalized = {
      ...draftItem,
      title: draftItem.title.trim(),
      shortDescription: draftItem.shortDescription.trim(),
      badge: draftItem.badge?.trim() ?? "",
      launchDate: draftItem.launchDate?.trim() ?? "",
      notifyLabel: draftItem.notifyLabel?.trim() ?? "Notify me",
      position: normalizePosition(draftItem.position, editingIndex !== null ? editingIndex + 1 : getNextPosition(items))
    };
    const nextItems =
      editingIndex !== null
        ? items.map((item, index) => (index === editingIndex ? normalized : { ...item, position: normalizePosition(item.position, index + 1) }))
        : [...items.map((item, index) => ({ ...item, position: normalizePosition(item.position, index + 1) })), normalized];
    onChange(nextItems);
    setFormError("");
    onPreviewDraft(nextItems);
  };

  const saveSectionCopy = () => {
    const nextTitle = sectionCopyDraft.title.trim();
    const nextSubtitle = sectionCopyDraft.subtitle.trim();
    if (!nextTitle) {
      setSectionCopyError("Section title is required.");
      return;
    }
    if (!nextSubtitle) {
      setSectionCopyError("Section subtitle is required.");
      return;
    }
    void (async () => {
      setSectionCopySaving(true);
      try {
        await onSectionCopySave({ title: nextTitle, subtitle: nextSubtitle });
        setSectionCopyError("");
      } catch (error) {
        setSectionCopyError(error instanceof Error ? error.message : "Failed to save section copy.");
      } finally {
        setSectionCopySaving(false);
      }
    })();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Section Copy</h4>
        <div className="mt-3 grid gap-3">
          {sectionCopyError ? (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {sectionCopyError}
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span>Section title</span>
            <input
              value={sectionCopyDraft.title}
              onChange={(event) => {
                setSectionCopyError("");
                setSectionCopyDraft((prev) => ({ ...prev, title: event.target.value }));
              }}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Section subtitle</span>
            <textarea
              value={sectionCopyDraft.subtitle}
              onChange={(event) => {
                setSectionCopyError("");
                setSectionCopyDraft((prev) => ({ ...prev, subtitle: event.target.value }));
              }}
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <button
            type="button"
            onClick={saveSectionCopy}
            disabled={sectionCopySaving}
            className="h-10 w-fit rounded-xl border border-slate-300 px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700"
          >
            {sectionCopySaving ? "Saving..." : "Save Section Copy"}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button type="button" onClick={openAdd} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white">
          Add Upcoming
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[minmax(0,1.6fr),minmax(0,1fr),minmax(0,1fr)]"
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex === null || dragIndex === index) return;
              const next = [...items];
              const [moved] = next.splice(dragIndex, 1);
              next.splice(index, 0, moved);
              const reordered = next.map((entry, itemIndex) => ({ ...entry, position: itemIndex + 1 }));
              void (async () => {
                setSaving(true);
                try {
                  await persistList(reordered);
                } catch (error) {
                  setFormError(error instanceof Error ? error.message : "Failed to reorder upcoming items.");
                } finally {
                  setSaving(false);
                  setDragIndex(null);
                }
              })();
            }}
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="text-lg font-semibold leading-tight">{item.title}</p>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.shortDescription || "No short description yet."}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Metadata</p>
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium dark:bg-slate-800"># {normalizePosition(item.position, index + 1)}</span>
                <span className={`rounded-full px-2 py-0.5 font-medium ${item.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-slate-200 dark:bg-slate-800"}`}>
                  {item.active ? "Active" : "Hidden"}
                </span>
                {item.badge?.trim() ? <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{item.badge}</span> : null}
              </div>
              <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">{item.launchDate?.trim() ? `Launch: ${item.launchDate}` : "No launch date set"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button type="button" onClick={() => openEdit(index)} className="h-9 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const duplicated = [...items.slice(0, index + 1), { ...item, id: makeId("upcoming"), title: `${item.title} Copy` }, ...items.slice(index + 1)].map(
                      (entry, itemIndex) => ({
                        ...entry,
                        position: itemIndex + 1
                      })
                    );
                    void persistList(duplicated);
                  }}
                  className="h-9 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700"
                >
                  Duplicate
                </button>
                <button type="button" onClick={() => setDeleteIndex(index)} className="h-9 rounded-lg border border-rose-300 px-2 py-1 text-rose-600 dark:border-rose-700 dark:text-rose-300">
                  Delete
                </button>
                <span className="flex h-9 cursor-grab items-center justify-center rounded-lg border border-slate-300 px-2 py-1 text-center dark:border-slate-700">
                  Drag
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Drawer title={editingIndex !== null ? "Edit Upcoming Item" : "Add Upcoming Item"} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="space-y-3">
          {formError ? (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {formError}
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span>Title</span>
            <input
              value={draftItem.title}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, title: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Short Description</span>
            <textarea
              value={draftItem.shortDescription}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, shortDescription: event.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Position</span>
              <input
                type="number"
                min={1}
                step={1}
                value={normalizePosition(draftItem.position, 1)}
                onChange={(event) => setDraftItem((prev) => ({ ...prev, position: normalizePosition(event.target.value, 1) }))}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Badge</span>
              <input
                value={draftItem.badge ?? ""}
                onChange={(event) => setDraftItem((prev) => ({ ...prev, badge: event.target.value }))}
                placeholder="Soon"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Launch Date</span>
              <input
                type="date"
                value={draftItem.launchDate ?? ""}
                onChange={(event) => setDraftItem((prev) => ({ ...prev, launchDate: event.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Notify Button Label</span>
              <input
                value={draftItem.notifyLabel ?? "Notify me"}
                onChange={(event) => setDraftItem((prev) => ({ ...prev, notifyLabel: event.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={draftItem.active}
                onChange={(event) => setDraftItem((prev) => ({ ...prev, active: event.target.checked }))}
              />
              Active
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span>Image (uploads only)</span>
            <div className="flex flex-wrap gap-2">
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
                onClick={() => setDraftItem((prev) => ({ ...prev, imageUrl: "" }))}
                className="h-10 rounded-xl border border-rose-300 px-3 text-sm text-rose-600 dark:border-rose-700 dark:text-rose-300"
              >
                Clear
              </button>
            </div>
          </label>
          {draftItem.imageUrl ? (
            <img src={draftItem.imageUrl} alt={draftItem.title || "Upcoming preview"} className="h-40 w-full rounded-xl object-cover" />
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={previewItem} className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
              Preview Page
            </button>
            <button
              type="button"
              onClick={saveItem}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={deleteIndex !== null}
        title="Delete upcoming item?"
        message="This action cannot be undone."
        onCancel={() => setDeleteIndex(null)}
        onConfirm={() => {
          if (deleteIndex === null) return;
          const filtered = items.filter((_, index) => index !== deleteIndex).map((entry, itemIndex) => ({ ...entry, position: itemIndex + 1 }));
          void persistList(filtered);
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

export default HealthUpcomingManager;
