import { useEffect, useState } from "react";
import { deleteMediaItem, getMediaLibrary, uploadMediaFiles, type MediaItem } from "../../utils/mediaLibrary";

const AccountUploadsEditor = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setError("");
        const media = await getMediaLibrary();
        setItems(media);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load media library.");
      } finally {
        setLoadingLibrary(false);
      }
    })();
  }, []);

  const openPreview = () => window.open("/?preview=draft", "_blank", "noopener,noreferrer");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        {message ? (
          <p className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        ) : null}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Product Media Library</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Upload images once and reuse them in product cards.</p>
          </div>
          <label
            className={`inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-white ${
              uploading ? "cursor-not-allowed bg-blue-400" : "cursor-pointer bg-blue-600"
            }`}
          >
            {uploading ? "Uploading..." : "Upload Images"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (!files.length) return;
                void (async () => {
                  try {
                    setUploading(true);
                    setError("");
                    setMessage("");
                    const created = await uploadMediaFiles(files);
                    setItems((prev) => [...created, ...prev]);
                    setMessage(`${created.length} image${created.length === 1 ? "" : "s"} uploaded successfully.`);
                  } catch (uploadError) {
                    setError(uploadError instanceof Error ? uploadError.message : "Failed to upload images.");
                  } finally {
                    setUploading(false);
                    event.target.value = "";
                  }
                })();
              }}
            />
          </label>
        </div>

        {loadingLibrary ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Loading media library...
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No uploaded images yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <img src={item.dataUrl} alt={item.name} className="h-36 w-full object-cover" />
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(item.dataUrl)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      Copy URL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          try {
                            setDeletingId(item.id);
                            setError("");
                            setMessage("");
                            await deleteMediaItem(item.id);
                            setItems((prev) => prev.filter((entry) => entry.id !== item.id));
                            setMessage("Image deleted.");
                          } catch (deleteError) {
                            setError(deleteError instanceof Error ? deleteError.message : "Failed to delete image.");
                          } finally {
                            setDeletingId(null);
                          }
                        })();
                      }}
                      disabled={deletingId === item.id}
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-600 dark:border-rose-700 dark:text-rose-300"
                    >
                      {deletingId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={openPreview} className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
          Preview Page
        </button>
      </div>
    </div>
  );
};

export default AccountUploadsEditor;
