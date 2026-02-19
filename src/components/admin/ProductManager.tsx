import { useEffect, useMemo, useState } from "react";
import type { Product, ProductCategory } from "../../data/siteData";
import { makeId } from "../../utils/ids";
import { getMediaLibrary, type MediaItem } from "../../utils/mediaLibrary";
import ConfirmDialog from "./ConfirmDialog";
import Drawer from "./Drawer";

type ProductManagerProps = {
  title: string;
  category: ProductCategory;
  items: Product[];
  sectionTitle: string;
  sectionDescription: string;
  onSectionCopySave: (next: { title: string; description: string }) => Promise<void> | void;
  onChange: (next: Product[]) => void;
  onPreviewDraft: (nextItems: Product[]) => void;
  onSaveAndPublish?: (nextItems: Product[]) => Promise<void> | void;
};

const createNewProduct = (category: ProductCategory): Product => ({
  id: makeId("prd"),
  position: 1,
  title: "",
  shortDescription: "",
  longDescription: "",
  features: [""],
  rating: 4.5,
  isNew: false,
  category,
  imageUrl: "",
  checkoutLink: "https://example.com/checkout/new"
});

const normalizePosition = (value: unknown, fallback: number) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.round(numeric));
};

const getNextPosition = (items: Product[]) =>
  items.reduce((max, item) => Math.max(max, normalizePosition(item.position, 0)), 0) + 1;

const ProductManager = ({
  title,
  category,
  items,
  sectionTitle,
  sectionDescription,
  onSectionCopySave,
  onChange,
  onPreviewDraft,
  onSaveAndPublish
}: ProductManagerProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftItem, setDraftItem] = useState<Product>(createNewProduct(category));
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
  const [sectionCopyDraft, setSectionCopyDraft] = useState({ title: sectionTitle, description: sectionDescription });
  const filteredMedia = mediaLibrary.filter((media) => media.name.toLowerCase().includes(imageSearch.trim().toLowerCase()));

  useEffect(() => {
    setSectionCopyDraft({ title: sectionTitle, description: sectionDescription });
  }, [sectionDescription, sectionTitle]);

  const persistProductList = async (nextItems: Product[]) => {
    onChange(nextItems);
    if (onSaveAndPublish) {
      await onSaveAndPublish(nextItems);
    }
  };

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

  const isEditing = useMemo(() => editingIndex !== null, [editingIndex]);

  const openAdd = () => {
    setEditingIndex(null);
    setDraftItem({ ...createNewProduct(category), position: getNextPosition(items) });
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

  const isValidUrl = (value: string) => {
    try {
      const parsed = new URL(value.trim());
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const validateDraftItem = (item: Product) => {
    if (!item.title.trim()) return "Title is required.";
    if (!item.shortDescription.trim()) return "Short description is required.";
    if (!item.longDescription.trim()) return "Long description is required.";
    if (!Number.isFinite(item.rating) || item.rating < 1 || item.rating > 5) return "Rating must be between 1 and 5.";
    if (!isValidUrl(item.checkoutLink)) return "Checkout URL must be a valid http(s) URL.";
    if (!Number.isFinite(item.position) || Number(item.position) < 1) return "Position must be a number greater than or equal to 1.";
    const cleanedFeatures = item.features.map((feature) => feature.trim()).filter(Boolean);
    if (cleanedFeatures.length === 0) return "At least one feature is required.";
    return "";
  };

  const saveItem = () => {
    const validationError = validateDraftItem(draftItem);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const normalizedDraft = {
      ...draftItem,
      position: normalizePosition(draftItem.position, isEditing && editingIndex !== null ? editingIndex + 1 : getNextPosition(items))
    };
    const nextItems =
      isEditing && editingIndex !== null
        ? items.map((item, index) =>
            index === editingIndex
              ? { ...normalizedDraft, features: normalizedDraft.features.map((entry) => entry.trim()).filter(Boolean) }
              : { ...item, position: normalizePosition(item.position, index + 1) }
          )
        : [
            ...items.map((item, index) => ({ ...item, position: normalizePosition(item.position, index + 1) })),
            {
              ...normalizedDraft,
              id: normalizedDraft.id || makeId("prd"),
              category,
              features: normalizedDraft.features.map((entry) => entry.trim()).filter(Boolean)
            }
          ];
    void (async () => {
      setSaving(true);
      try {
        onChange(nextItems);
        if (onSaveAndPublish) {
          await onSaveAndPublish(nextItems);
        }
        setFormError("");
        setDrawerOpen(false);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Failed to save product.");
      } finally {
        setSaving(false);
      }
    })();
  };

  const previewItem = () => {
    const validationError = validateDraftItem(draftItem);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const normalizedDraft = {
      ...draftItem,
      position: normalizePosition(draftItem.position, isEditing && editingIndex !== null ? editingIndex + 1 : getNextPosition(items))
    };
    const nextItems =
      isEditing && editingIndex !== null
        ? items.map((item, index) =>
            index === editingIndex
              ? { ...normalizedDraft, features: normalizedDraft.features.map((entry) => entry.trim()).filter(Boolean) }
              : { ...item, position: normalizePosition(item.position, index + 1) }
          )
        : [
            ...items.map((item, index) => ({ ...item, position: normalizePosition(item.position, index + 1) })),
            {
              ...normalizedDraft,
              id: normalizedDraft.id || makeId("prd"),
              category,
              features: normalizedDraft.features.map((entry) => entry.trim()).filter(Boolean)
            }
          ];
    onChange(nextItems);
    setFormError("");
    onPreviewDraft(nextItems);
  };

  const saveSectionCopy = (target: "title" | "description") => {
    const nextTitle = sectionCopyDraft.title.trim();
    const nextDescription = sectionCopyDraft.description.trim();
    if (!nextTitle) {
      setSectionCopyError("Section title is required.");
      return;
    }
    if (!nextDescription) {
      setSectionCopyError("Section description is required.");
      return;
    }
    void (async () => {
      setSectionCopySaving(true);
      try {
        await onSectionCopySave({ title: nextTitle, description: nextDescription });
        setSectionCopyError("");
      } catch (error) {
        setSectionCopyError(error instanceof Error ? error.message : `Failed to save section ${target}.`);
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
          <div className="grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
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
            <button
              type="button"
              onClick={() => saveSectionCopy("title")}
              disabled={sectionCopySaving}
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700"
            >
              {sectionCopySaving ? "Saving..." : "Save Title"}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
            <label className="block space-y-1 text-sm">
              <span>Section description</span>
              <textarea
                value={sectionCopyDraft.description}
                onChange={(event) => {
                  setSectionCopyError("");
                  setSectionCopyDraft((prev) => ({ ...prev, description: event.target.value }));
                }}
                rows={2}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <button
              type="button"
              onClick={() => saveSectionCopy("description")}
              disabled={sectionCopySaving}
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700"
            >
              {sectionCopySaving ? "Saving..." : "Save Description"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button type="button" onClick={openAdd} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white">
          Add Product
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
              const reordered = next.map((entry, itemIndex) => ({ ...entry, position: itemIndex + 1 }));
              void (async () => {
                setSaving(true);
                try {
                  await persistProductList(reordered);
                  setFormError("");
                } catch (error) {
                  setFormError(error instanceof Error ? error.message : "Failed to reorder products.");
                } finally {
                  setSaving(false);
                  setDragIndex(null);
                }
              })();
            }}
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="text-lg font-semibold leading-tight">{item.title}</p>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{item.checkoutLink}</p>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.shortDescription || "No short description yet."}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Metadata</p>
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium dark:bg-slate-800"># {normalizePosition(item.position, index + 1)}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium dark:bg-slate-800">rating {item.rating.toFixed(1)}</span>
                {item.isNew ? <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">NEW</span> : null}
                <span className="rounded-full bg-slate-200 px-2 py-0.5 dark:bg-slate-800">{item.category}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.features.length} feature points</p>
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
                    const duplicated = [...items.slice(0, index + 1), { ...item, id: makeId("prd"), title: `${item.title} Copy` }, ...items.slice(index + 1)].map(
                      (entry, itemIndex) => ({
                        ...entry,
                        position: itemIndex + 1
                      })
                    );
                    void (async () => {
                      setSaving(true);
                      try {
                        await persistProductList(duplicated);
                        setFormError("");
                      } catch (error) {
                        setFormError(error instanceof Error ? error.message : "Failed to duplicate product.");
                      } finally {
                        setSaving(false);
                      }
                    })();
                  }}
                  className="h-9 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700"
                >
                  Duplicate
                </button>
                <button type="button" onClick={() => setDeleteIndex(index)} className="h-9 rounded-lg border border-rose-300 px-2 py-1 text-rose-600 dark:border-rose-700 dark:text-rose-300">
                  Delete
                </button>
                <span className="flex h-9 cursor-grab items-center justify-center rounded-lg border border-slate-300 px-2 py-1 text-center dark:border-slate-700" aria-label="Drag to reorder">
                  Drag
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Drawer title={isEditing ? "Edit Product" : "Add Product"} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
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
          <label className="block space-y-1 text-sm">
            <span>Long Description</span>
            <textarea
              value={draftItem.longDescription}
              onChange={(event) => setDraftItem((prev) => ({ ...prev, longDescription: event.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>Features</span>
              <button
                type="button"
                onClick={() => setDraftItem((prev) => ({ ...prev, features: [...prev.features, ""] }))}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {draftItem.features.map((feature, index) => (
                <div key={`feature-${index}`} className="grid grid-cols-[1fr,auto] gap-2">
                  <input
                    value={feature}
                    onChange={(event) =>
                      setDraftItem((prev) => ({
                        ...prev,
                        features: prev.features.map((item, i) => (i === index ? event.target.value : item))
                      }))
                    }
                    className="h-10 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraftItem((prev) => ({
                        ...prev,
                        features: prev.features.filter((_, i) => i !== index)
                      }))
                    }
                    className="rounded-xl border border-rose-300 px-3 text-sm text-rose-600 dark:border-rose-700 dark:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
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
              <span>Rating</span>
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={draftItem.rating}
                onChange={(event) => setDraftItem((prev) => ({ ...prev, rating: Number(event.target.value) }))}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input
                type="checkbox"
                checked={draftItem.isNew}
                onChange={(event) => setDraftItem((prev) => ({ ...prev, isNew: event.target.checked }))}
              />
              Is New
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span>Checkout URL</span>
              <input
                value={draftItem.checkoutLink}
                onChange={(event) => setDraftItem((prev) => ({ ...prev, checkoutLink: event.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span>Image URL (optional)</span>
              <input
                value={draftItem.imageUrl ?? ""}
                onChange={(event) => setDraftItem((prev) => ({ ...prev, imageUrl: event.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <div className="md:col-span-2">
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
            {draftItem.imageUrl ? (
              <div className="md:col-span-2">
                <img src={draftItem.imageUrl} alt="Selected product media preview" className="h-36 w-full rounded-xl object-cover" />
              </div>
            ) : null}
          </div>
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
        title="Delete product?"
        message="This action cannot be undone."
        onCancel={() => setDeleteIndex(null)}
        onConfirm={() => {
          if (deleteIndex === null) return;
          const filtered = items.filter((_, index) => index !== deleteIndex).map((entry, itemIndex) => ({ ...entry, position: itemIndex + 1 }));
          void (async () => {
            setSaving(true);
            try {
              await persistProductList(filtered);
              setFormError("");
              setDeleteIndex(null);
            } catch (error) {
              setFormError(error instanceof Error ? error.message : "Failed to delete product.");
            } finally {
              setSaving(false);
            }
          })();
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

export default ProductManager;
