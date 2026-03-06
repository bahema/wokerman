
import type { ReactNode } from "react";
import type { FashionBossDraft } from "../../../utils/fashionDraft";
import type { FashionProduct } from "../../../data/fashionCatalog";

type DraftSection = "homepage" | "collections" | "editorial" | "styleNotes" | "pricing" | "whatsapp";
type PatchDraft = <K extends DraftSection>(section: K, value: Partial<FashionBossDraft[K]>) => void;

type CollectionChipDefinition = {
  id: string;
  label: string;
  count: number;
  kind: "system" | "category" | "custom";
};

type CollectionsStudioWorkspaceProps = {
  renderSectionActionBar: (section: string) => ReactNode;
  selectedCollectionPanel: "filters" | "spotlight" | "browse";
  setSelectedCollectionPanel: (panel: "filters" | "spotlight" | "browse") => void;
  draft: FashionBossDraft;
  patchDraft: PatchDraft;
  addCustomCollectionChip: () => void;
  removeCustomCollectionChip: (chipId: string) => void;
  chooseNextSpotlightProduct: () => void;
  setProductPickerTarget: (target: { scope: "spotlight" } | null) => void;
  collectionChipDefinitions: CollectionChipDefinition[];
  renameCustomCollectionChip: (chipId: string, label: string) => void;
  collectionSpotlightProduct: FashionProduct | null;
};

const CollectionsStudioWorkspace = (props: CollectionsStudioWorkspaceProps) => {
  const {
    renderSectionActionBar,
    selectedCollectionPanel,
    setSelectedCollectionPanel,
    draft,
    patchDraft,
    addCustomCollectionChip,
    removeCustomCollectionChip,
    chooseNextSpotlightProduct,
    setProductPickerTarget,
    collectionChipDefinitions,
    renameCustomCollectionChip,
    collectionSpotlightProduct
  } = props;

  return (                <div className="grid gap-5 xl:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
                  <div className="space-y-5">
                    {renderSectionActionBar("Collections")}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                    {[
                      ["Active chips", collectionChipDefinitions.length],
                      ["Category chips", collectionChipDefinitions.filter((chip: any) => chip.kind === "category").length],
                      ["Spotlight mode", draft.collections.spotlightMode === "manual" ? "Manual" : "Auto"],
                      ["Browse pacing", `${draft.collections.initialVisibleCount} + ${draft.collections.loadMoreCount}`]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-black/8 bg-white/65 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</div>
                        <div className="mt-3 text-2xl font-black">{value}</div>
                      </div>
                    ))}
                    </div>

                    <div className="flex flex-wrap gap-2 fa-card p-4">
                    {([
                      ["filters", "Filter chips"],
                      ["spotlight", "Spotlight"],
                      ["browse", "Browse pacing"]
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedCollectionPanel(id)}
                        className={selectedCollectionPanel === id ? "fa-tab-btn fa-tab-btn-active" : "fa-tab-btn"}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  </div>

                  <div className="min-w-0 max-h-[58dvh] md:max-h-[42rem] overflow-y-auto pr-2">
                  {selectedCollectionPanel === "filters" && (
                    <div className="grid gap-5 xl:grid-cols-[1.05fr_minmax(0,0.95fr)]">
                      <div className="fa-card p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Filter chip manager</p>
                            <h3 className="mt-1 text-lg font-black">Visible collections filters</h3>
                          </div>
                          <button type="button" onClick={addCustomCollectionChip} className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs">Add chip</button>
                        </div>
                        <div className="mt-4 space-y-3">
                          {collectionChipDefinitions.map((chip: any) => (
                            <div key={chip.id} className="fa-card p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {chip.kind === "custom" ? (
                                      <input
                                        value={chip.label}
                                        onChange={(e) => renameCustomCollectionChip(chip.id, e.target.value)}
                                        className="min-w-[10rem] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/5"
                                      />
                                    ) : (
                                      <span className="font-semibold">{chip.label}</span>
                                    )}
                                    <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:bg-white/10">{chip.kind}</span>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{chip.count} linked products</div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {chip.kind === "custom" ? (
                                    <button type="button" onClick={() => removeCustomCollectionChip(chip.id)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Delete</button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="fa-card p-5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Filter behavior</p>
                        <div className="mt-4 space-y-4">
                          <div className="rounded-2xl border border-black/8 bg-white/70 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            Use this panel to control which chip families appear on <span className="font-semibold">/fashion/collections</span>. System chips stay visible by default, while category chips should be curated and cleaned here.
                          </div>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold">Collections page title</span>
                            <input value={draft.collections.pageTitle} onChange={(e) => patchDraft("collections", { pageTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold">Collections page intro</span>
                            <textarea value={draft.collections.pageIntro} onChange={(e) => patchDraft("collections", { pageIntro: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold">Collection inquiry label</span>
                            <input value={draft.collections.collectionInquiryLabel} onChange={(e) => patchDraft("collections", { collectionInquiryLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold">Load more label</span>
                            <input value={draft.collections.loadMoreLabel} onChange={(e) => patchDraft("collections", { loadMoreLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCollectionPanel === "spotlight" && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div className="fa-card p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Spotlight editor</p>
                            <h3 className="mt-1 text-lg font-black">Collection spotlight</h3>
                          </div>
                          <select value={draft.collections.spotlightMode} onChange={(e) => patchDraft("collections", { spotlightMode: e.target.value as "auto" | "manual" })} className="fa-input fa-select text-sm">
                            <option value="auto">Auto</option>
                            <option value="manual">Manual</option>
                          </select>
                        </div>
                        {collectionSpotlightProduct ? (
                          <div className="mt-4 rounded-3xl border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                            <div className={`h-40 rounded-3xl ${collectionSpotlightProduct.palette}`} />
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:bg-white/10">{collectionSpotlightProduct.collection}</span>
                              <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:bg-white/10">{collectionSpotlightProduct.category}</span>
                            </div>
                            <div className="mt-3 text-xl font-black">{collectionSpotlightProduct.name}</div>
                            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{collectionSpotlightProduct.note}</div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button type="button" onClick={() => setProductPickerTarget({ scope: "spotlight" })} className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs">Choose product</button>
                              <button type="button" className="fa-btn fa-btn-ghost rounded-full px-4 py-2 text-xs" onClick={chooseNextSpotlightProduct}>Refresh match</button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="fa-card p-5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Spotlight copy</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="space-y-2 md:col-span-2">
                            <span className="text-sm font-semibold">Focus note</span>
                            <textarea
                              rows={3}
                              value={draft.collections.pageIntro}
                              onChange={(e) => patchDraft("collections", { pageIntro: e.target.value })}
                              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5"
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold">CTA label</span>
                            <input
                              value={draft.collections.collectionInquiryLabel}
                              onChange={(e) => patchDraft("collections", { collectionInquiryLabel: e.target.value })}
                              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5"
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold">Source</span>
                            <input
                              readOnly
                              value={draft.collections.spotlightMode === "manual" ? "Manual pick" : "Auto ranking"}
                              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCollectionPanel === "browse" && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <div className="fa-card p-5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Browse pacing</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="space-y-2"><span className="text-sm font-semibold">Default sort</span><select value={draft.collections.defaultSort} onChange={(e) => patchDraft("collections", { defaultSort: e.target.value as "featured" | "newest" | "price-low" | "price-high" })} className="fa-input fa-select w-full"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select></label>
                          <div className="rounded-2xl border border-black/8 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Current pattern</div>
                            <div className="mt-2 text-xl font-black">{draft.collections.initialVisibleCount} + {draft.collections.loadMoreCount}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Initial view, then repeat load-more step</div>
                          </div>
                          <label className="space-y-2"><span className="text-sm font-semibold">Initial visible count</span><input type="number" min={1} value={draft.collections.initialVisibleCount} onChange={(e) => patchDraft("collections", { initialVisibleCount: Number(e.target.value) || 1 })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Load more count</span><input type="number" min={1} value={draft.collections.loadMoreCount} onChange={(e) => patchDraft("collections", { loadMoreCount: Number(e.target.value) || 1 })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        </div>
                      </div>
                      <div className="fa-card p-5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Collections conversion</p>
                        <div className="mt-4 space-y-4">
                          <label className="space-y-2">
                            <span className="text-sm font-semibold">Collection inquiry label</span>
                            <input value={draft.collections.collectionInquiryLabel} onChange={(e) => patchDraft("collections", { collectionInquiryLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                          </label>
                          <div className="rounded-2xl border border-dashed border-black/12 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
                            This panel should control how aggressively products are revealed in the browse grid and how the section-level inquiry CTA appears before the user commits to a single item.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
  );
};

export default CollectionsStudioWorkspace;







