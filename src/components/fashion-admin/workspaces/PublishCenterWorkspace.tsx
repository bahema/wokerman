import { FashionAdminButton, FashionAdminCard, FashionAdminTable, FashionAdminValidationPanel } from "../primitives";
import { withBasePath } from "../../../utils/basePath";

type PublishCenterWorkspaceProps = any;

const PublishCenterWorkspace = ({
  workspaceCounts,
  saveDraft,
  publishDraft,
  resetDraft,
  isBootstrapping,
  isSavingRemote,
  isPublishingRemote,
  isResettingRemote,
  fashionMeta,
  publishSectionRows,
  previewLinks,
  selectedProduct,
  draft,
  whatsAppApiSettings,
  publishedAt,
  savedAt,
  selectedHomepageSlide,
  selectedEditorialSlide,
  selectedProductId,
  patchHomepageSlide,
  patchEditorialSlide,
  patchProductDraft,
  productDraft
}: PublishCenterWorkspaceProps) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {workspaceCounts.map(([label, value]: [string, string | number]) => (
        <FashionAdminCard key={label} className="p-4">
          <p className="fa-admin-label">{label}</p>
          <p className="mt-3 text-3xl font-black">{value}</p>
        </FashionAdminCard>
      ))}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <FashionAdminCard className="p-5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Publish actions</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <FashionAdminButton onClick={() => { void saveDraft(); }} disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}>
            {isSavingRemote ? "Saving..." : "Save draft"}
          </FashionAdminButton>
          <FashionAdminButton variant="primary" onClick={() => { void publishDraft(); }} disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}>
            {isPublishingRemote ? "Publishing..." : "Publish now"}
          </FashionAdminButton>
          <FashionAdminButton className="fa-btn-danger-soft" onClick={() => { void resetDraft(); }} disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}>
            {isResettingRemote ? "Resetting..." : "Reset draft"}
          </FashionAdminButton>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FashionAdminValidationPanel title="Draft state" tone={fashionMeta?.hasDraft ? "warning" : "success"}>
            {fashionMeta?.hasDraft ? "Unpublished draft changes exist." : "Draft and published are aligned."}
          </FashionAdminValidationPanel>
          <FashionAdminValidationPanel title="Release note" tone="warning">
            Publish pushes homepage, collections, editorial, style notes, and WhatsApp CTA changes together.
          </FashionAdminValidationPanel>
        </div>
      </FashionAdminCard>
      <FashionAdminCard className="p-5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Affected sections</p>
        <FashionAdminTable
          className="mt-4"
          columns={[
            { key: "section", label: "Section" },
            { key: "primary", label: "Primary count" },
            { key: "secondary", label: "Secondary signal" }
          ]}
          rows={publishSectionRows}
        />
      </FashionAdminCard>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <FashionAdminCard className="p-5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Live page links</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {previewLinks.map(([label, path]: [string, string]) => (
            <FashionAdminButton key={path} onClick={() => window.open(withBasePath(path), "_blank", "noopener,noreferrer")}>
              {label}
            </FashionAdminButton>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <FashionAdminCard className="p-4 text-sm">
            <div className="font-semibold">Current product</div>
            <div className="mt-2 text-base font-black text-slate-900 dark:text-white">{selectedProduct?.name ?? "None selected"}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{selectedProduct?.collection ?? "No collection"}</div>
          </FashionAdminCard>
          <FashionAdminCard className="p-4 text-sm">
            <div className="font-semibold">Homepage story title</div>
            <div className="mt-2">{draft.homepage.storiesTitle}</div>
          </FashionAdminCard>
        </div>
      </FashionAdminCard>

      <FashionAdminCard className="p-5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Page health</p>
        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <FashionAdminValidationPanel title="Publish state" tone="success">
            Publish state: <span className="font-semibold">{publishedAt ? `Published ${publishedAt}` : savedAt ? `Draft saved ${savedAt}` : "Draft only"}</span>
          </FashionAdminValidationPanel>
          <FashionAdminValidationPanel title="Current destination" tone="warning">
            Current destination: <span className="font-semibold break-all">{draft.whatsapp.phoneNumber}</span>
          </FashionAdminValidationPanel>
          <FashionAdminValidationPanel title="Disclaimer" tone="warning">{draft.whatsapp.disclaimer}</FashionAdminValidationPanel>
          <FashionAdminValidationPanel title="API mode" tone="success">
            WhatsApp API mode: <span className="font-semibold">{whatsAppApiSettings.enabled ? "Enabled" : "Fallback to wa.me link"}</span>
          </FashionAdminValidationPanel>
          <FashionAdminValidationPanel title="API recipient" tone="warning">
            API recipient: <span className="font-semibold break-all">{whatsAppApiSettings.recipientPhoneNumber || "Not configured"}</span>
          </FashionAdminValidationPanel>
        </div>
      </FashionAdminCard>
    </div>

    <FashionAdminCard className="p-5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Quick editor references</p>
      <FashionAdminTable
        className="mt-4"
        columns={[
          { key: "surface", label: "Surface" },
          { key: "selection", label: "Selection" },
          { key: "status", label: "Status" }
        ]}
        rows={[
          {
            key: "homepage-slide",
            cells: [
              "Homepage slide",
              selectedHomepageSlide?.headline ?? "None selected",
              selectedHomepageSlide ? "Ready to edit" : "No selection"
            ]
          },
          {
            key: "editorial-slide",
            cells: [
              "Editorial slide",
              selectedEditorialSlide?.headline ?? "None selected",
              selectedEditorialSlide ? "Ready to edit" : "No selection"
            ]
          },
          {
            key: "product",
            cells: ["Product", selectedProduct?.name ?? "None selected", selectedProductId ? "Ready to edit" : "No selection"]
          }
        ]}
      />

      {selectedHomepageSlide ? (
        <div className="mt-4 max-h-[48dvh] md:max-h-[26rem] space-y-3 overflow-y-auto pr-1">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Homepage eyebrow</span>
            <input value={selectedHomepageSlide.eyebrow} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { eyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Homepage headline</span>
            <textarea value={selectedHomepageSlide.headline} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { headline: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5" />
          </label>
        </div>
      ) : null}

      {!selectedHomepageSlide && selectedEditorialSlide ? (
        <div className="mt-4 max-h-[48dvh] md:max-h-[26rem] space-y-3 overflow-y-auto pr-1">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Editorial eyebrow</span>
            <input value={selectedEditorialSlide.eyebrow} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { eyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Editorial headline</span>
            <textarea value={selectedEditorialSlide.headline} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { headline: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5" />
          </label>
        </div>
      ) : null}

      {!selectedHomepageSlide && !selectedEditorialSlide && selectedProductId ? (
        <div className="mt-4 max-h-[48dvh] md:max-h-[26rem] space-y-3 overflow-y-auto pr-1">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Product name</span>
            <input value={productDraft.name} onChange={(e) => patchProductDraft({ name: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Category</span>
              <input value={productDraft.category} onChange={(e) => patchProductDraft({ category: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Price</span>
              <input value={productDraft.price} onChange={(e) => patchProductDraft({ price: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5" />
            </label>
          </div>
        </div>
      ) : null}

      {!selectedHomepageSlide && !selectedEditorialSlide && !selectedProductId ? (
        <FashionAdminValidationPanel className="mt-4" tone="warning" title="Selection required">
          Select a homepage slide, editorial slide, or product to see quick context editing here.
        </FashionAdminValidationPanel>
      ) : null}
    </FashionAdminCard>
  </div>
);

export default PublishCenterWorkspace;
