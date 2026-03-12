import { FashionAdminButton, FashionAdminCard, FashionAdminChip, FashionAdminPreviewCard } from "../primitives";
import { FashionAdminValidationPanel } from "../primitives";
import type { ChangeEvent, RefObject, ReactNode } from "react";

type MediaAsset = {
  id: string;
  kind: "image" | "video";
  name: string;
  url: string;
};

type MediaLibraryWorkspaceProps = {
  renderSectionActionBar: (section: string) => ReactNode;
  imageUploadInputRef: RefObject<HTMLInputElement>;
  handleMediaUpload: (kind: "image" | "video", event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  mediaAssets: MediaAsset[];
  mediaUsageMap: Record<string, string[]>;
  removeMediaAsset: (assetId: string) => Promise<void>;
  isUploadingMedia: boolean;
  mediaStatusMessage: string | null;
  mediaErrorMessage: string | null;
  applyUploadsToEmptyHomepageSlides: () => void;
  applyUploadsToEmptyEditorialSlides: () => void;
};

const MediaLibraryWorkspace = (props: MediaLibraryWorkspaceProps) => {
  const {
    renderSectionActionBar,
    imageUploadInputRef,
    handleMediaUpload,
    mediaAssets,
    mediaUsageMap,
    removeMediaAsset,
    isUploadingMedia,
    mediaStatusMessage,
    mediaErrorMessage,
    applyUploadsToEmptyHomepageSlides,
    applyUploadsToEmptyEditorialSlides
  } = props;

  const imageAssets = mediaAssets.filter((asset) => asset.kind === "image");

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
      <div className="space-y-5">
        {renderSectionActionBar("Uploads")}
        <input ref={imageUploadInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void handleMediaUpload("image", event); }} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {[
            ["Images", imageAssets.length],
            ["Visible assets", mediaAssets.length],
            ["Upload status", isUploadingMedia ? "Uploading..." : "Ready"]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-black/8 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(247,238,228,0.72))] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</div>
              <div className="mt-3 text-2xl font-black">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 max-h-[58dvh] md:max-h-[42rem] overflow-y-auto pr-2">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <FashionAdminCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Media intake</p>
                <h3 className="mt-1 text-lg font-black">Upload once, choose everywhere</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <FashionAdminButton variant="primary" className="text-xs" onClick={() => imageUploadInputRef.current?.click()} disabled={isUploadingMedia}>
                  {isUploadingMedia ? "Uploading..." : "Upload images"}
                </FashionAdminButton>
              </div>
            </div>

            {mediaErrorMessage ? (
              <FashionAdminValidationPanel className="mt-4" tone="error" title="Upload error">
                {mediaErrorMessage}
              </FashionAdminValidationPanel>
            ) : null}

            {mediaStatusMessage ? (
              <FashionAdminValidationPanel className="mt-4" tone="success" title="Upload status">
                {mediaStatusMessage}
              </FashionAdminValidationPanel>
            ) : null}

            <FashionAdminValidationPanel className="mt-4" tone="warning" title="Library policy">
              Product and slide editors should choose visuals from this web-based library. They should not require direct computer uploads inside each item editor.
            </FashionAdminValidationPanel>
          </FashionAdminCard>

          <FashionAdminCard className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Client slider sync</p>
            <div className="mt-4 space-y-3">
              <FashionAdminButton className="w-full justify-center text-xs" onClick={applyUploadsToEmptyHomepageSlides} disabled={imageAssets.length === 0}>
                Fill empty homepage slider images
              </FashionAdminButton>
              <FashionAdminButton className="w-full justify-center text-xs" onClick={applyUploadsToEmptyEditorialSlides} disabled={imageAssets.length === 0}>
                Fill empty editorial slider images
              </FashionAdminButton>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This only fills slides that currently have no image. Save and publish to reflect on client pages.
              </p>
            </div>
          </FashionAdminCard>

          <FashionAdminCard className="xl:col-span-2 p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Library</p>
            {mediaAssets.length === 0 ? (
              <FashionAdminValidationPanel className="mt-4" tone="warning" title="No uploads yet">
                Upload images to populate the library. Accepted image types are JPG, PNG, WEBP, GIF, and AVIF.
              </FashionAdminValidationPanel>
            ) : (
              <div className="mt-4 grid max-h-[54dvh] md:max-h-[32rem] gap-4 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {mediaAssets.map((asset) => (
                  <div key={asset.id} className="space-y-3">
                    <FashionAdminPreviewCard
                      title={asset.name}
                      subtitle={asset.kind === "image" ? "Image asset" : "Video asset"}
                      imageUrl={asset.kind === "image" ? asset.url : undefined}
                      imageFallbackClassName="bg-[linear-gradient(145deg,#1f1a16,#66503f_58%,#c7a27a)]"
                      actions={
                        <>
                          <FashionAdminChip>{asset.kind}</FashionAdminChip>
                          {mediaUsageMap[asset.url]?.length ? <FashionAdminChip>{mediaUsageMap[asset.url].length} refs</FashionAdminChip> : null}
                          <FashionAdminButton
                            onClick={() => {
                              void navigator.clipboard?.writeText(asset.url);
                            }}
                          >
                            Copy URL
                          </FashionAdminButton>
                          <FashionAdminButton
                            className="border-[var(--fa-error-border)] text-[var(--fa-error-text)] hover:bg-[var(--fa-error-bg)]"
                            onClick={() => {
                              void removeMediaAsset(asset.id);
                            }}
                          >
                            Delete
                          </FashionAdminButton>
                        </>
                      }
                    />
                    {mediaUsageMap[asset.url]?.length ? (
                      <FashionAdminValidationPanel tone="warning" title="In use">
                        {mediaUsageMap[asset.url].join(", ")}
                      </FashionAdminValidationPanel>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </FashionAdminCard>
        </div>
      </div>
    </div>
  );
};

export default MediaLibraryWorkspace;
