import type { ReactNode } from "react";
import type { FashionProduct } from "../../../data/fashionCatalog";
import type { FashionBossDraft } from "../../../utils/fashionDraft";

type DraftSection = "homepage" | "collections" | "editorial" | "styleNotes" | "pricing" | "whatsapp";
type PatchDraft = <K extends DraftSection>(section: K, value: Partial<FashionBossDraft[K]>) => void;
type StyleSetId = FashionBossDraft["styleNotes"]["defaultSet"];
type StyleNotesMediaField = "heroImage" | "panelImage";

type StyleNotesStudioWorkspaceProps = {
  renderSectionActionBar: (section: string) => ReactNode;
  draft: FashionBossDraft;
  patchDraft: PatchDraft;
  patchStyleIntroNote: (index: number, value: string) => void;
  patchStyleSetMeta: (setId: StyleSetId, value: Partial<FashionBossDraft["styleNotes"]["setMeta"][StyleSetId]>) => void;
  removeStyleSetProduct: (index: number) => void;
  moveStyleSetProduct: (index: number, direction: -1 | 1) => void;
  setProductPickerTarget: (target: { scope: "style" } | null) => void;
  selectedStyleSetProducts: FashionProduct[];
  editStyleSetProduct: (productId: string) => void;
  duplicateStyleSetProduct: (index: number) => void;
  setStyleNotesMediaField: (field: StyleNotesMediaField | null) => void;
};

const styleSetTabs: Array<{ key: StyleSetId; label: string }> = [
  { key: "office", label: "Office" },
  { key: "weekend", label: "Weekend" },
  { key: "evening", label: "Evening" },
  { key: "travel", label: "Travel" }
];

const StyleNotesStudioWorkspace = ({
  renderSectionActionBar,
  draft,
  patchDraft,
  patchStyleIntroNote,
  patchStyleSetMeta,
  removeStyleSetProduct,
  moveStyleSetProduct,
  setProductPickerTarget,
  selectedStyleSetProducts,
  editStyleSetProduct,
  duplicateStyleSetProduct,
  setStyleNotesMediaField
}: StyleNotesStudioWorkspaceProps) => {
  const activeSetMeta = draft.styleNotes.setMeta[draft.styleNotes.defaultSet];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
      <div className="space-y-5">
        {renderSectionActionBar("Style Notes")}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {[
            ["Active set", draft.styleNotes.defaultSet],
            ["Set items", selectedStyleSetProducts.length],
            ["Look CTA", draft.styleNotes.lookCtaLabel],
            ["Fit CTA", draft.styleNotes.fitCtaLabel]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-black/8 bg-white/65 p-4">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
              <div className="mt-3 text-2xl font-black">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 max-h-[58dvh] overflow-y-auto pr-2 md:max-h-[42rem]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="fa-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700">Set manager</p>
                <h3 className="mt-1 text-lg font-black">Style sets</h3>
              </div>
              <button type="button" onClick={() => setProductPickerTarget({ scope: "style" })} className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs">
                Add item
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/8 bg-white/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Hero image</p>
                <div className="mt-2 aspect-[16/10] overflow-hidden rounded-xl border border-black/10 bg-[#f5efe7]">
                  {draft.styleNotes.heroImage ? <img src={draft.styleNotes.heroImage} alt="Style notes hero preview" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setStyleNotesMediaField("heroImage")} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">
                    Choose
                  </button>
                  {draft.styleNotes.heroImage ? (
                    <button type="button" onClick={() => patchDraft("styleNotes", { heroImage: "" })} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1.5 text-xs">
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border border-black/8 bg-white/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Panel image</p>
                <div className="mt-2 aspect-[16/10] overflow-hidden rounded-xl border border-black/10 bg-[#f5efe7]">
                  {draft.styleNotes.panelImage ? <img src={draft.styleNotes.panelImage} alt="Style notes panel preview" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setStyleNotesMediaField("panelImage")} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">
                    Choose
                  </button>
                  {draft.styleNotes.panelImage ? (
                    <button type="button" onClick={() => patchDraft("styleNotes", { panelImage: "" })} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1.5 text-xs">
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {styleSetTabs.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => patchDraft("styleNotes", { defaultSet: key })}
                  className={draft.styleNotes.defaultSet === key ? "fa-tab-btn fa-tab-btn-active text-xs uppercase tracking-[0.16em]" : "fa-tab-btn text-xs uppercase tracking-[0.16em]"}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold">Style Notes page title</span>
                <textarea value={draft.styleNotes.pageTitle} onChange={(e) => patchDraft("styleNotes", { pageTitle: e.target.value })} rows={2} className="fa-input min-h-[90px] w-full" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Helper title</span>
                <input value={draft.styleNotes.helperTitle} onChange={(e) => patchDraft("styleNotes", { helperTitle: e.target.value })} className="fa-input w-full" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Panel intro</span>
                <input value={draft.styleNotes.panelIntro} onChange={(e) => patchDraft("styleNotes", { panelIntro: e.target.value })} className="fa-input w-full" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Look CTA</span>
                <input value={draft.styleNotes.lookCtaLabel} onChange={(e) => patchDraft("styleNotes", { lookCtaLabel: e.target.value })} className="fa-input w-full" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Pairing label</span>
                <input value={draft.styleNotes.pairingEyebrow} onChange={(e) => patchDraft("styleNotes", { pairingEyebrow: e.target.value })} className="fa-input w-full" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold">Fit CTA</span>
                <input value={draft.styleNotes.fitCtaLabel} onChange={(e) => patchDraft("styleNotes", { fitCtaLabel: e.target.value })} className="fa-input w-full" />
              </label>
              {draft.styleNotes.introNotes.map((note, index) => (
                <label key={`style-intro-${index}`} className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold">Intro note {index + 1}</span>
                  <textarea value={note} onChange={(e) => patchStyleIntroNote(index, e.target.value)} rows={2} className="fa-input min-h-[84px] w-full" />
                </label>
              ))}
              <label className="space-y-2">
                <span className="text-sm font-semibold">Set title</span>
                <input value={activeSetMeta.title} onChange={(e) => patchStyleSetMeta(draft.styleNotes.defaultSet, { title: e.target.value })} className="fa-input w-full" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Set badge</span>
                <input value={activeSetMeta.badge} onChange={(e) => patchStyleSetMeta(draft.styleNotes.defaultSet, { badge: e.target.value })} className="fa-input w-full" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold">Set note</span>
                <textarea value={activeSetMeta.note} onChange={(e) => patchStyleSetMeta(draft.styleNotes.defaultSet, { note: e.target.value })} rows={3} className="fa-input min-h-[96px] w-full" />
              </label>
            </div>
          </div>

          <div className="fa-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700">Set items</p>
                <h3 className="mt-1 text-lg font-black">Editable item list</h3>
              </div>
              <span className="rounded-full border border-black/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                {selectedStyleSetProducts.length} items
              </span>
            </div>
            <div className="mt-4 max-h-[52dvh] space-y-3 overflow-y-auto pr-1 md:max-h-[30rem]">
              {selectedStyleSetProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/12 px-4 py-5 text-sm text-slate-600">
                  No items in this set yet. Click <span className="font-semibold">Add item</span> to insert a product into the active style set.
                </div>
              ) : (
                selectedStyleSetProducts.map((product, index) => (
                  <div key={`${draft.styleNotes.defaultSet}-${product.id}-${index}`} className="fa-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">#{index + 1}</span>
                          <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">{product.collection}</span>
                          <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">{product.category}</span>
                        </div>
                        <div className="mt-3 text-base font-black">{product.name}</div>
                        <div className="mt-1 text-sm text-slate-600">{product.note}</div>
                      </div>
                      <div className={`h-20 w-16 shrink-0 rounded-2xl ${product.palette}`} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => editStyleSetProduct(product.id)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">
                        Edit
                      </button>
                      <button type="button" onClick={() => duplicateStyleSetProduct(index)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">
                        Duplicate
                      </button>
                      <button type="button" onClick={() => removeStyleSetProduct(index)} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1.5 text-xs">
                        Delete
                      </button>
                      <button type="button" onClick={() => moveStyleSetProduct(index, -1)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">
                        Move up
                      </button>
                      <button type="button" onClick={() => moveStyleSetProduct(index, 1)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">
                        Move down
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleNotesStudioWorkspace;
