
import { withBasePath } from "../../../utils/basePath";
import type { ReactNode } from "react";
import type { FashionBossDraft, FashionHomepageBlockId } from "../../../utils/fashionDraft";
import type { FashionHeroSlide, FashionProduct } from "../../../data/fashionCatalog";
import { FASHION_ROUTE_TARGETS, type FashionRouteTarget } from "../../../utils/fashionRouteTargets";

type DraftSection = "homepage" | "collections" | "editorial" | "styleNotes" | "pricing" | "whatsapp";
type PatchDraft = <K extends DraftSection>(section: K, value: Partial<FashionBossDraft[K]>) => void;

type HomepageBlockDefinition = {
  id: string;
  title: string;
  note: string;
  kind: string;
  keyCount?: number;
};

type HomepageEditorOverlayArgs = {
  title: string;
  description: string;
  onClose: () => void;
  onSaveDraft: () => void;
  onSaveAndPublish: () => void;
  children: ReactNode;
  widthClass?: string;
};

type HomepageStudioWorkspaceProps = {
  renderSectionActionBar: (section: string) => ReactNode;
  homepageBlockDefinitions: HomepageBlockDefinition[];
  homepageAssignments: Record<FashionHomepageBlockId, string[]>;
  selectedHomepageBlock: FashionHomepageBlockId;
  setSelectedHomepageBlock: (id: FashionHomepageBlockId) => void;
  selectedHomepageDefinition: { title: string; note: string; kind: string };
  patchDraft: PatchDraft;
  draft: FashionBossDraft;
  setProductPickerTarget: (target: { scope: "homepage"; blockId: FashionHomepageBlockId } | null) => void;
  selectedHomepageSlide: FashionHeroSlide | null;
  patchHomepageSlide: (slideId: string, value: Partial<FashionHeroSlide>) => void;
  setSlideMediaTarget: (target: { scope: "homepage" | "editorial"; slideId: string } | null) => void;
  addHomepageSlide: () => void;
  homepageSlides: FashionHeroSlide[];
  selectedHomepageSlideId: string;
  setSelectedHomepageSlideId: (id: string) => void;
  duplicateHomepageSlide: (slideId: string) => void;
  deleteHomepageSlide: (slideId: string) => void;
  moveHomepageSlide: (slideId: string, direction: -1 | 1) => void;
  renderEditorOverlay: (args: HomepageEditorOverlayArgs) => ReactNode;
  saveDraft: () => void;
  publishDraft: () => void;
  slideBadgeOptions: readonly string[];
  updateTrustPoint: (index: number, value: string) => void;
  addTrustPoint: () => void;
  removeTrustPoint: (index: number) => void;
  selectedHomepageProducts: FashionProduct[];
  editHomepageProduct: (productId: string) => void;
  removeProductFromHomepageBlock: (blockId: FashionHomepageBlockId, productId: string) => void;
  moveHomepageProduct: (blockId: FashionHomepageBlockId, productId: string, direction: -1 | 1) => void;
};

const HomepageStudioWorkspace = (props: HomepageStudioWorkspaceProps) => {
  const {
    renderSectionActionBar,
    homepageBlockDefinitions,
    homepageAssignments,
    selectedHomepageBlock,
    setSelectedHomepageBlock,
    selectedHomepageDefinition,
    patchDraft,
    draft,
    setProductPickerTarget,
    selectedHomepageSlide,
    patchHomepageSlide,
    setSlideMediaTarget,
    addHomepageSlide,
    homepageSlides,
    selectedHomepageSlideId,
    setSelectedHomepageSlideId,
    duplicateHomepageSlide,
    deleteHomepageSlide,
    moveHomepageSlide,
    renderEditorOverlay,
    saveDraft,
    publishDraft,
    slideBadgeOptions,
    updateTrustPoint,
    addTrustPoint,
    removeTrustPoint,
    selectedHomepageProducts,
    editHomepageProduct,
    removeProductFromHomepageBlock,
    moveHomepageProduct
  } = props;
  const routeLabel: Record<FashionRouteTarget, string> = {
    "/fashion": "New Arrivals",
    "/fashion/collections": "Collections",
    "/fashion/editorial": "Editorial",
    "/fashion/style-notes": "Style Notes"
  };

  return (                <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1.05fr)]">
                  <div className="xl:col-span-2">{renderSectionActionBar("Homepage")}</div>
                  <div className="space-y-4 fa-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Homepage block map</p>
                        <h3 className="mt-1 text-lg font-black">New Arrivals modules</h3>
                      </div>
                      <span className="rounded-full border border-black/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:border-white/10">
                        {homepageBlockDefinitions.length} blocks
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[60dvh] md:max-h-[44rem] overflow-y-auto pr-1">
                      {homepageBlockDefinitions.map((block: any) => {
                        const blockId = block.id as FashionHomepageBlockId;
                        const assignmentCount = (homepageAssignments[blockId] ?? []).length;
                        const isActive = selectedHomepageBlock === blockId;
                        return (
                          <button
                            key={blockId}
                            type="button"
                            onClick={() => setSelectedHomepageBlock(blockId)}
                            className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                              isActive
                                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                                : "border-black/6 bg-white/60 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold">{block.title}</div>
                                <div className={`mt-1 text-xs leading-5 ${isActive ? "text-white/75 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>{block.note}</div>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${isActive ? "bg-white/12 text-white/85 dark:bg-slate-900/10 dark:text-slate-900" : "bg-black/5 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}>
                                {block.kind}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${isActive ? "bg-white/12 text-white/85 dark:bg-slate-900/10 dark:text-slate-800" : "bg-black/5 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}>
                                {assignmentCount} items
                              </span>
                              {typeof block.keyCount === "number" ? (
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${isActive ? "bg-white/12 text-white/85 dark:bg-slate-900/10 dark:text-slate-800" : "bg-black/5 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}>
                                  {block.keyCount} references
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="max-h-[58dvh] md:max-h-[42rem] space-y-5 overflow-y-auto pr-2">
                    <div className="rounded-[1.8rem] border border-black/8 bg-[linear-gradient(140deg,rgba(255,255,255,0.85),rgba(247,238,228,0.78))] p-5 shadow-[0_24px_55px_-36px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Selected block</p>
                          <h3 className="mt-1 text-xl font-black">{selectedHomepageDefinition.title}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-black/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:border-white/10">
                            {selectedHomepageDefinition.kind}
                          </span>
                          <span className="rounded-full border border-black/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:border-white/10">
                            {(homepageAssignments[selectedHomepageBlock] ?? []).length} linked
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{selectedHomepageDefinition.note}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-black/8 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
                          <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Block type</div>
                          <div className="mt-2 text-sm font-bold">{selectedHomepageDefinition.kind}</div>
                        </div>
                        <div className="rounded-2xl border border-black/8 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
                          <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Linked items</div>
                          <div className="mt-2 text-sm font-bold">{(homepageAssignments[selectedHomepageBlock] ?? []).length}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
                      <div className="space-y-5">
                    {selectedHomepageBlock === "storefront-hero" && (
                      <>
                      <div className="grid gap-5 fa-card p-5 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-semibold">Stories eyebrow</span>
                          <input value={draft.homepage.storiesEyebrow} onChange={(e) => patchDraft("homepage", { storiesEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold">Stories title</span>
                          <input value={draft.homepage.storiesTitle} onChange={(e) => patchDraft("homepage", { storiesTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold">Hero eyebrow</span>
                          <input value={draft.homepage.heroEyebrow} onChange={(e) => patchDraft("homepage", { heroEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm font-semibold">Hero headline</span>
                          <textarea value={draft.homepage.heroHeadline} onChange={(e) => patchDraft("homepage", { heroHeadline: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm font-semibold">Hero subtext</span>
                          <textarea value={draft.homepage.heroSubtext} onChange={(e) => patchDraft("homepage", { heroSubtext: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm font-semibold">Stories support note</span>
                          <textarea value={draft.homepage.storiesSupportNote} onChange={(e) => patchDraft("homepage", { storiesSupportNote: e.target.value })} rows={2} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold">Primary hero CTA label</span>
                          <input value={draft.homepage.heroPrimaryCtaLabel} onChange={(e) => patchDraft("homepage", { heroPrimaryCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold">Secondary hero CTA label</span>
                          <input value={draft.homepage.heroSecondaryCtaLabel} onChange={(e) => patchDraft("homepage", { heroSecondaryCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold">Storefront focus eyebrow</span>
                          <input value={draft.homepage.storefrontFocusEyebrow} onChange={(e) => patchDraft("homepage", { storefrontFocusEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold">Storefront card title</span>
                          <input value={draft.homepage.storefrontFocusCardTitle} onChange={(e) => patchDraft("homepage", { storefrontFocusCardTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm font-semibold">Storefront card headline</span>
                          <input value={draft.homepage.storefrontFocusCardHeadline} onChange={(e) => patchDraft("homepage", { storefrontFocusCardHeadline: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm font-semibold">Storefront card note</span>
                          <textarea value={draft.homepage.storefrontFocusCardNote} onChange={(e) => patchDraft("homepage", { storefrontFocusCardNote: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                        </label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Stat 1 label</span><input value={draft.homepage.storefrontFocusStatOneLabel} onChange={(e) => patchDraft("homepage", { storefrontFocusStatOneLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Stat 1 value</span><input value={draft.homepage.storefrontFocusStatOneValue} onChange={(e) => patchDraft("homepage", { storefrontFocusStatOneValue: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Stat 2 label</span><input value={draft.homepage.storefrontFocusStatTwoLabel} onChange={(e) => patchDraft("homepage", { storefrontFocusStatTwoLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Stat 2 value</span><input value={draft.homepage.storefrontFocusStatTwoValue} onChange={(e) => patchDraft("homepage", { storefrontFocusStatTwoValue: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Stat 3 label</span><input value={draft.homepage.storefrontFocusStatThreeLabel} onChange={(e) => patchDraft("homepage", { storefrontFocusStatThreeLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Stat 3 value</span><input value={draft.homepage.storefrontFocusStatThreeValue} onChange={(e) => patchDraft("homepage", { storefrontFocusStatThreeValue: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Visual merchandising label</span><input value={draft.homepage.storefrontFocusVisualLabel} onChange={(e) => patchDraft("homepage", { storefrontFocusVisualLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Visual merchandising note</span><textarea rows={3} value={draft.homepage.storefrontFocusVisualNote} onChange={(e) => patchDraft("homepage", { storefrontFocusVisualNote: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Page direction label</span><input value={draft.homepage.pageDirectionEyebrow} onChange={(e) => patchDraft("homepage", { pageDirectionEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Page direction item 1</span><input value={draft.homepage.pageDirectionItemOne} onChange={(e) => patchDraft("homepage", { pageDirectionItemOne: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Page direction item 2</span><input value={draft.homepage.pageDirectionItemTwo} onChange={(e) => patchDraft("homepage", { pageDirectionItemTwo: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Page direction item 3</span><input value={draft.homepage.pageDirectionItemThree} onChange={(e) => patchDraft("homepage", { pageDirectionItemThree: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Page direction item 4</span><input value={draft.homepage.pageDirectionItemFour} onChange={(e) => patchDraft("homepage", { pageDirectionItemFour: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Featured drops title</span><input value={draft.homepage.featuredDropsTitle} onChange={(e) => patchDraft("homepage", { featuredDropsTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Featured drops label</span><input value={draft.homepage.featuredDropsEyebrow} onChange={(e) => patchDraft("homepage", { featuredDropsEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Most asked label</span><input value={draft.homepage.mostAskedEyebrow} onChange={(e) => patchDraft("homepage", { mostAskedEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Best seller label</span><input value={draft.homepage.bestSellerEyebrow} onChange={(e) => patchDraft("homepage", { bestSellerEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2"><span className="text-sm font-semibold">Editor picks label</span><input value={draft.homepage.editorsPicksEyebrow} onChange={(e) => patchDraft("homepage", { editorsPicksEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Trust section label</span><input value={draft.homepage.trustEyebrow} onChange={(e) => patchDraft("homepage", { trustEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                      </div>
                      <div className="fa-card p-5">
                        <div className="mb-4">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Client shell copy</p>
                          <h3 className="mt-1 text-lg font-black">Homepage, footer, and modal labels</h3>
                        </div>
                        <div className="grid max-h-[54dvh] md:max-h-[32rem] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
                          <label className="space-y-2"><span className="text-sm font-semibold">Complete look label</span><input value={draft.homepage.completeLookEyebrow} onChange={(e) => patchDraft("homepage", { completeLookEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Complete look CTA</span><input value={draft.homepage.completeLookCtaLabel} onChange={(e) => patchDraft("homepage", { completeLookCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Complete look title</span><textarea rows={2} value={draft.homepage.completeLookTitle} onChange={(e) => patchDraft("homepage", { completeLookTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Set value label</span><input value={draft.homepage.completeLookValueEyebrow} onChange={(e) => patchDraft("homepage", { completeLookValueEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Set value note</span><textarea rows={3} value={draft.homepage.completeLookValueNote} onChange={(e) => patchDraft("homepage", { completeLookValueNote: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Accessories label</span><input value={draft.homepage.accessoriesEyebrow} onChange={(e) => patchDraft("homepage", { accessoriesEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Accessories CTA</span><input value={draft.homepage.accessoriesCtaLabel} onChange={(e) => patchDraft("homepage", { accessoriesCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Accessories title</span><textarea rows={2} value={draft.homepage.accessoriesTitle} onChange={(e) => patchDraft("homepage", { accessoriesTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Elevated edit label</span><input value={draft.homepage.elevatedEditEyebrow} onChange={(e) => patchDraft("homepage", { elevatedEditEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Elevated edit title</span><textarea rows={2} value={draft.homepage.elevatedEditTitle} onChange={(e) => patchDraft("homepage", { elevatedEditTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Most asked title</span><textarea rows={2} value={draft.homepage.mostAskedTitle} onChange={(e) => patchDraft("homepage", { mostAskedTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Most asked CTA</span><input value={draft.homepage.mostAskedCtaLabel} onChange={(e) => patchDraft("homepage", { mostAskedCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Best seller title</span><textarea rows={2} value={draft.homepage.bestSellerTitle} onChange={(e) => patchDraft("homepage", { bestSellerTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Best seller CTA</span><input value={draft.homepage.bestSellerCtaLabel} onChange={(e) => patchDraft("homepage", { bestSellerCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Editor picks title</span><textarea rows={2} value={draft.homepage.editorsPicksTitle} onChange={(e) => patchDraft("homepage", { editorsPicksTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Editor picks CTA</span><input value={draft.homepage.editorsPicksCtaLabel} onChange={(e) => patchDraft("homepage", { editorsPicksCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Shop the drop label</span><input value={draft.homepage.shopTheDropEyebrow} onChange={(e) => patchDraft("homepage", { shopTheDropEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Shop the drop CTA</span><input value={draft.homepage.shopTheDropCtaLabel} onChange={(e) => patchDraft("homepage", { shopTheDropCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Shop the drop title</span><textarea rows={2} value={draft.homepage.shopTheDropTitle} onChange={(e) => patchDraft("homepage", { shopTheDropTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Trust title</span><textarea rows={2} value={draft.homepage.trustTitle} onChange={(e) => patchDraft("homepage", { trustTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Trust description</span><textarea rows={3} value={draft.homepage.trustDescription} onChange={(e) => patchDraft("homepage", { trustDescription: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Footer label</span><input value={draft.homepage.footerEyebrow} onChange={(e) => patchDraft("homepage", { footerEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Footer support label</span><input value={draft.homepage.footerSupportEyebrow} onChange={(e) => patchDraft("homepage", { footerSupportEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Footer intro note</span><textarea rows={2} value={draft.homepage.footerIntroNote} onChange={(e) => patchDraft("homepage", { footerIntroNote: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Footer support title</span><textarea rows={2} value={draft.homepage.footerSupportTitle} onChange={(e) => patchDraft("homepage", { footerSupportTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Footer links label</span><input value={draft.homepage.footerLinksEyebrow} onChange={(e) => patchDraft("homepage", { footerLinksEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Footer contact label</span><input value={draft.homepage.footerContactEyebrow} onChange={(e) => patchDraft("homepage", { footerContactEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Footer contact note</span><textarea rows={2} value={draft.homepage.footerContactNote} onChange={(e) => patchDraft("homepage", { footerContactNote: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Footer status note</span><input value={draft.homepage.footerStatusNote} onChange={(e) => patchDraft("homepage", { footerStatusNote: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Footer home label</span><input value={draft.homepage.footerLinkHomeLabel} onChange={(e) => patchDraft("homepage", { footerLinkHomeLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Footer editorial label</span><input value={draft.homepage.footerLinkEditorialLabel} onChange={(e) => patchDraft("homepage", { footerLinkEditorialLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Footer collections label</span><input value={draft.homepage.footerLinkCollectionsLabel} onChange={(e) => patchDraft("homepage", { footerLinkCollectionsLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Footer style notes label</span><input value={draft.homepage.footerLinkStyleNotesLabel} onChange={(e) => patchDraft("homepage", { footerLinkStyleNotesLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Modal why label</span><input value={draft.homepage.modalWhyLabel} onChange={(e) => patchDraft("homepage", { modalWhyLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Modal fit CTA</span><input value={draft.homepage.modalFitCtaLabel} onChange={(e) => patchDraft("homepage", { modalFitCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Modal commerce notice</span><textarea rows={2} value={draft.homepage.modalCommerceNotice} onChange={(e) => patchDraft("homepage", { modalCommerceNotice: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Quick pair label</span><input value={draft.homepage.modalQuickPairEyebrow} onChange={(e) => patchDraft("homepage", { modalQuickPairEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Quick pair note</span><input value={draft.homepage.modalQuickPairNote} onChange={(e) => patchDraft("homepage", { modalQuickPairNote: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Continue button</span><input value={draft.homepage.modalContinueLabel} onChange={(e) => patchDraft("homepage", { modalContinueLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Pair section title</span><input value={draft.homepage.modalPairTitle} onChange={(e) => patchDraft("homepage", { modalPairTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Pair section note</span><input value={draft.homepage.modalPairNote} onChange={(e) => patchDraft("homepage", { modalPairNote: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Featured related label</span><input value={draft.homepage.modalFeaturedRelatedLabel} onChange={(e) => patchDraft("homepage", { modalFeaturedRelatedLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Modal empty state</span><textarea rows={2} value={draft.homepage.modalEmptyRelatedNote} onChange={(e) => patchDraft("homepage", { modalEmptyRelatedNote: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                        </div>
                      </div>
                      </>
                    )}

                    {selectedHomepageBlock === "featured-stories" && (
                      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                        <div className="fa-card p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Slider manager</p>
                              <h3 className="mt-1 text-lg font-black">Featured stories</h3>
                            </div>
                            <button type="button" onClick={addHomepageSlide} className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs">Add slide</button>
                          </div>
                          <div className="mt-4 max-h-[50dvh] md:max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                            {homepageSlides.map((slide: any, index: number) => (
                              <div key={slide.id} className={`rounded-2xl border p-4 ${selectedHomepageSlideId === slide.id ? "border-slate-900/15 bg-white shadow-sm dark:border-white/20 dark:bg-white/10" : "border-black/8 bg-white/70 dark:border-white/10 dark:bg-white/5"}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <button type="button" onClick={() => setSelectedHomepageSlideId(slide.id)} className="min-w-0 flex-1 text-left">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:bg-white/10">Slide {index + 1}</span>
                                      <span className={`rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:bg-white/10 ${slide.accent}`}>{slide.badge || slide.eyebrow}</span>
                                    </div>
                                    <div className="mt-3 text-base font-black">{slide.headline}</div>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{slide.primaryCta} • {slide.secondaryCta}</div>
                                  </button>
                                  {slide.imageUrl ? (
                                    <img
                                      src={slide.imageUrl}
                                      alt={slide.headline}
                                      className="h-20 w-16 shrink-0 rounded-2xl object-cover"
                                      onError={(event) => {
                                        event.currentTarget.src = withBasePath("/logo.png");
                                      }}
                                    />
                                  ) : (
                                    <div className={`h-20 w-16 shrink-0 rounded-2xl ${slide.palette}`} />
                                  )}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button type="button" onClick={() => setSelectedHomepageSlideId(slide.id)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Edit</button>
                                  <button type="button" onClick={() => duplicateHomepageSlide(slide.id)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Duplicate</button>
                                  <button type="button" onClick={() => deleteHomepageSlide(slide.id)} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1 text-[10px]">Delete</button>
                                  <button type="button" onClick={() => moveHomepageSlide(slide.id, -1)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Move up</button>
                                  <button type="button" onClick={() => moveHomepageSlide(slide.id, 1)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Move down</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {selectedHomepageSlide
                          ? renderEditorOverlay({
                              title: "Homepage Slide Editor",
                              description: "Edit the selected homepage story in a closable overlay.",
                              onClose: () => setSelectedHomepageSlideId(""),
                              onSaveDraft: () => {
                                void saveDraft();
                              },
                              onSaveAndPublish: () => {
                                void publishDraft();
                              },
                              children: (
                                <div className="space-y-4">
                                  <label className="space-y-2">
                                    <span className="text-sm font-semibold">Stories title</span>
                                    <input value={draft.homepage.storiesTitle} onChange={(e) => patchDraft("homepage", { storiesTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                                  </label>
                                  {selectedHomepageSlide.imageUrl ? (
                                    <img
                                      src={selectedHomepageSlide.imageUrl}
                                      alt={selectedHomepageSlide.headline}
                                      className="h-32 w-full rounded-3xl object-cover"
                                      onError={(event) => {
                                        event.currentTarget.src = withBasePath("/logo.png");
                                      }}
                                    />
                                  ) : (
                                    <div className={`h-32 rounded-3xl ${selectedHomepageSlide.palette}`} />
                                  )}
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <label className="space-y-2"><span className="text-sm font-semibold">Eyebrow</span><input value={selectedHomepageSlide.eyebrow} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { eyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                    <label className="space-y-2"><span className="text-sm font-semibold">Badge</span><select value={selectedHomepageSlide.badge ?? "New"} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { badge: e.target.value })} className="fa-input fa-select w-full">{slideBadgeOptions.map((option: any) => <option key={option} value={option}>{option}</option>)}</select></label>
                                    <label className="space-y-2"><span className="text-sm font-semibold">Primary CTA</span><input value={selectedHomepageSlide.primaryCta} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { primaryCta: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                    <label className="space-y-2">
                                      <span className="text-sm font-semibold">Primary CTA destination</span>
                                      <select
                                        value={selectedHomepageSlide.primaryCtaHref ?? ""}
                                        onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { primaryCtaHref: e.target.value || undefined })}
                                        className="fa-input fa-select w-full"
                                      >
                                        <option value="">Auto by slide order</option>
                                        {FASHION_ROUTE_TARGETS.map((route) => (
                                        <option key={route} value={route}>
                                          {routeLabel[route]}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                    <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Headline</span><textarea value={selectedHomepageSlide.headline} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { headline: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                    <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Subtext</span><textarea value={selectedHomepageSlide.subtext} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { subtext: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                    <label className="space-y-2"><span className="text-sm font-semibold">Secondary CTA</span><input value={selectedHomepageSlide.secondaryCta} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { secondaryCta: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                    <label className="space-y-2">
                                      <span className="text-sm font-semibold">Secondary CTA destination</span>
                                      <select
                                        value={selectedHomepageSlide.secondaryCtaHref ?? ""}
                                        onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { secondaryCtaHref: e.target.value || undefined })}
                                        className="fa-input fa-select w-full"
                                      >
                                        <option value="">Auto by slide order</option>
                                        {FASHION_ROUTE_TARGETS.map((route) => (
                                        <option key={route} value={route}>
                                          {routeLabel[route]}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                    <label className="space-y-2"><span className="text-sm font-semibold">Accent class</span><input value={selectedHomepageSlide.accent} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { accent: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                    <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Visual palette</span><textarea value={selectedHomepageSlide.palette} onChange={(e) => patchHomepageSlide(selectedHomepageSlide.id, { palette: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                    <div className="space-y-2 md:col-span-2">
                                      <span className="text-sm font-semibold">Slide image</span>
                                      <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => setSlideMediaTarget({ scope: "homepage", slideId: selectedHomepageSlide.id })} className="fa-btn fa-btn-ghost rounded-full px-4 py-2 text-xs">
                                          {selectedHomepageSlide.imageUrl ? "Replace image" : "Choose image"}
                                        </button>
                                        {selectedHomepageSlide.imageUrl ? (
                                          <button type="button" onClick={() => patchHomepageSlide(selectedHomepageSlide.id, { imageUrl: undefined })} className="fa-btn fa-btn-danger-soft rounded-full px-4 py-2 text-xs">
                                            Remove image
                                          </button>
                                        ) : null}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400 break-all">
                                        {selectedHomepageSlide.imageUrl || "No custom image selected. Generated visual fallback will be used."}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          : null}
                      </div>
                    )}

                    {(selectedHomepageBlock === "why-shop-here" || selectedHomepageBlock === "footer") && (
                      <div className="fa-card p-5">
                        <div className="flex flex-wrap gap-3">
                          {selectedHomepageBlock === "why-shop-here" && (
                            <div className="grid w-full gap-3">
                              {draft.trustPoints.map((point: any, index: number) => (
                                <div key={`${index}-${point}`} className="rounded-2xl border border-black/8 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                                  <div className="font-semibold">Point {index + 1}</div>
                                  <textarea
                                    value={point}
                                    onChange={(e) => updateTrustPoint(index, e.target.value)}
                                    rows={2}
                                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs dark:border-white/10 dark:bg-white/5"
                                  />
                                  <div className="mt-3 flex gap-2">
                                    <button type="button" onClick={addTrustPoint} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Add point</button>
                                    <button type="button" onClick={() => removeTrustPoint(index)} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1 text-[10px]">Delete</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {selectedHomepageBlock === "footer" && (
                            <div className="w-full rounded-2xl border border-dashed border-black/12 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
                              Footer should expose summary text, quick links, and the direct WhatsApp CTA. This block is now positioned correctly for a dedicated footer editor next.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                      </div>

                      <div className="space-y-5">
                    {selectedHomepageDefinition.kind === "products" || selectedHomepageDefinition.kind === "bundle" ? (
                      <div className="fa-card p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Product assignments</p>
                            <h4 className="mt-1 text-lg font-black">Add, edit, remove, and reorder</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setProductPickerTarget({ scope: "homepage", blockId: selectedHomepageBlock })}
                            className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs"
                          >
                            Add product
                          </button>
                        </div>
                        <div className="max-h-[52dvh] md:max-h-[30rem] space-y-3 overflow-y-auto pr-1">
                          {selectedHomepageProducts.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-black/12 px-4 py-5 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
                              No products assigned yet. Use <span className="font-semibold">Add product</span> first, then manage each item with edit, delete, and order controls.
                            </div>
                          ) : (
                            selectedHomepageProducts.map((product: any, index: number) => (
                              <div key={`${selectedHomepageBlock}-${product.id}`} className="fa-card p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:bg-white/10">#{index + 1}</span>
                                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:bg-white/10">{product.collection}</span>
                                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] dark:bg-white/10">{product.category}</span>
                                    </div>
                                    <div className="mt-3 text-base font-black">{product.name}</div>
                                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{product.note}</div>
                                  </div>
                                  <div className={`h-20 w-16 shrink-0 rounded-2xl ${product.palette}`} />
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button type="button" onClick={() => editHomepageProduct(product.id)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">Edit</button>
                                  <button type="button" onClick={() => removeProductFromHomepageBlock(selectedHomepageBlock, product.id)} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1.5 text-xs">Delete</button>
                                  <button type="button" onClick={() => moveHomepageProduct(selectedHomepageBlock, product.id, -1)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">Move up</button>
                                  <button type="button" onClick={() => moveHomepageProduct(selectedHomepageBlock, product.id, 1)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">Move down</button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div className="fa-card p-5">
                      <div className="mb-4">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Section visibility</p>
                        <h4 className="mt-1 text-lg font-black">Homepage rails and supporting strips</h4>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                        {([
                          ["showTrending", "Trending rail"],
                          ["showAccessories", "Accessories"],
                          ["showMostAsked", "Most asked"],
                          ["showBestSeller", "Best seller"],
                          ["showEditorsPicks", "Editor’s picks"]
                        ] as const).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-3 rounded-2xl border border-black/8 px-4 py-3 dark:border-white/10">
                            <input type="checkbox" checked={draft.homepage[key]} onChange={(e) => patchDraft("homepage", { [key]: e.target.checked })} />
                            <span className="text-sm font-medium">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                      </div>
                    </div>
                  </div>
                </div>

  );
};

export default HomepageStudioWorkspace;








