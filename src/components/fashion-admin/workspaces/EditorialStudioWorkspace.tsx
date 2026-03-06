import { withBasePath } from "../../../utils/basePath";
import type { ReactNode } from "react";
import type { FashionBossDraft } from "../../../utils/fashionDraft";
import type { FashionHeroSlide, FashionProduct } from "../../../data/fashionCatalog";
import { FASHION_ROUTE_TARGETS, type FashionRouteTarget } from "../../../utils/fashionRouteTargets";

type DraftSection = "homepage" | "collections" | "editorial" | "styleNotes" | "pricing" | "whatsapp";
type PatchDraft = <K extends DraftSection>(section: K, value: Partial<FashionBossDraft[K]>) => void;

type EditorialEditorOverlayArgs = {
  title: string;
  description: string;
  onClose: () => void;
  onSaveDraft: () => void;
  onSaveAndPublish: () => void;
  children: ReactNode;
  widthClass?: string;
};

type EditorialMediaField =
  | "introPrimaryImage"
  | "introSecondaryImage"
  | "introTertiaryImage"
  | "campaignNotesImage"
  | "chapterTwoPrimaryImage"
  | "chapterTwoSecondaryImage"
  | "chapterTwoTertiaryImage"
  | "finalChapterPrimaryImage"
  | "finalChapterSecondaryImage"
  | "finalChapterTertiaryImage";

type EditorialStudioWorkspaceProps = {
  renderSectionActionBar: (section: string) => ReactNode;
  selectedEditorialPanel: "slider" | "chapters" | "story-cta";
  setSelectedEditorialPanel: (panel: "slider" | "chapters" | "story-cta") => void;
  editorialSlides: FashionHeroSlide[];
  selectedEditorialSlide: FashionHeroSlide | null;
  selectedEditorialSlideId: string;
  setSelectedEditorialSlideId: (id: string) => void;
  addEditorialSlide: () => void;
  patchEditorialSlide: (slideId: string, value: Partial<FashionHeroSlide>) => void;
  setSlideMediaTarget: (target: { scope: "homepage" | "editorial"; slideId: string } | null) => void;
  draft: FashionBossDraft;
  patchDraft: PatchDraft;
  setProductPickerTarget: (target: { scope: "editorial-chapter" | "editorial-story" | "editorial-related"; index: number } | null) => void;
  moveEditorialListProduct: (setList: (updater: (current: string[]) => string[]) => void, index: number, direction: -1 | 1) => void;
  removeEditorialListProduct: (setList: (updater: (current: string[]) => string[]) => void, index: number) => void;
  previewEditorialStoryCta: () => void;
  setEditorialStoryProductIds: (updater: (current: string[]) => string[]) => void;
  setEditorialChapterProductIds: (updater: (current: string[]) => string[]) => void;
  setEditorialRelatedProductIds: (updater: (current: string[]) => string[]) => void;
  editorialChapterTwoProducts: FashionProduct[];
  editorialProducts: FashionProduct[];
  editorialRelatedStoryProducts: FashionProduct[];
  duplicateEditorialSlide: (slideId: string) => void;
  deleteEditorialSlide: (slideId: string) => void;
  moveEditorialSlide: (slideId: string, direction: -1 | 1) => void;
  renderEditorOverlay: (args: EditorialEditorOverlayArgs) => ReactNode;
  saveDraft: () => void;
  publishDraft: () => void;
  slideBadgeOptions: readonly string[];
  editorialMediaFieldLabels: Record<EditorialMediaField, string>;
  setEditorialMediaField: (field: EditorialMediaField | null) => void;
};

const EditorialStudioWorkspace = (props: EditorialStudioWorkspaceProps) => {
  const {
    renderSectionActionBar,
    selectedEditorialPanel,
    setSelectedEditorialPanel,
    editorialSlides,
    selectedEditorialSlide,
    setSelectedEditorialSlideId,
    addEditorialSlide,
    patchEditorialSlide,
    setSlideMediaTarget,
    draft,
    patchDraft,
    setProductPickerTarget,
    moveEditorialListProduct,
    removeEditorialListProduct,
    previewEditorialStoryCta,
    setEditorialStoryProductIds,
    setEditorialChapterProductIds,
    setEditorialRelatedProductIds,
    editorialChapterTwoProducts,
    editorialProducts,
    editorialRelatedStoryProducts,
    selectedEditorialSlideId,
    duplicateEditorialSlide,
    deleteEditorialSlide,
    moveEditorialSlide,
    renderEditorOverlay,
    saveDraft,
    publishDraft,
    slideBadgeOptions,
    editorialMediaFieldLabels,
    setEditorialMediaField
  } = props;
  const routeLabel: Record<FashionRouteTarget, string> = {
    "/fashion": "New Arrivals",
    "/fashion/collections": "Collections",
    "/fashion/editorial": "Editorial",
    "/fashion/style-notes": "Style Notes"
  };

  return (                <div className="grid gap-5 xl:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
                  <div className="space-y-5">
                    {renderSectionActionBar("Editorial")}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                    {[
                      ["Campaign slides", editorialSlides.length],
                      ["Chapter products", editorialChapterTwoProducts.length],
                      ["Story picks", editorialProducts.length],
                      ["Related strip", editorialRelatedStoryProducts.length]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-black/8 bg-white/65 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</div>
                        <div className="mt-3 text-2xl font-black">{value}</div>
                      </div>
                    ))}
                    </div>

                    <div className="flex flex-wrap gap-2 fa-card p-4">
                    {([
                      ["slider", "Campaign slider"],
                      ["chapters", "Story chapters"],
                      ["story-cta", "Story conversion"]
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedEditorialPanel(id)}
                        className={selectedEditorialPanel === id ? "fa-tab-btn fa-tab-btn-active" : "fa-tab-btn"}
                      >
                        {label}
                      </button>
                    ))}
                    </div>
                  </div>

                  <div className="min-w-0 max-h-[58dvh] md:max-h-[42rem] overflow-y-auto pr-2">
                  {selectedEditorialPanel === "slider" && (
                    <div className="grid gap-5 xl:grid-cols-[1.05fr_minmax(0,0.95fr)]">
                      <div className="fa-card p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Slider manager</p>
                            <h3 className="mt-1 text-lg font-black">Campaign stories</h3>
                          </div>
                          <button type="button" onClick={addEditorialSlide} className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs">Add slide</button>
                        </div>
                        <div className="mt-4 max-h-[50dvh] md:max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                          {editorialSlides.map((slide: any, index: number) => (
                            <div key={slide.id} className={`rounded-2xl border p-4 ${selectedEditorialSlideId === slide.id ? "border-slate-900/15 bg-white shadow-sm dark:border-white/20 dark:bg-white/10" : "border-black/8 bg-white/70 dark:border-white/10 dark:bg-white/5"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <button type="button" onClick={() => setSelectedEditorialSlideId(slide.id)} className="min-w-0 flex-1 text-left">
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
                                <button type="button" onClick={() => setSelectedEditorialSlideId(slide.id)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">Edit</button>
                                <button type="button" onClick={() => duplicateEditorialSlide(slide.id)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">Duplicate</button>
                                <button type="button" onClick={() => deleteEditorialSlide(slide.id)} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1.5 text-xs">Delete</button>
                                <button type="button" onClick={() => moveEditorialSlide(slide.id, -1)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">Move up</button>
                                <button type="button" onClick={() => moveEditorialSlide(slide.id, 1)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">Move down</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {selectedEditorialSlide
                        ? renderEditorOverlay({
                            title: "Editorial Slide Editor",
                            description: "Edit the selected editorial campaign slide in a closable overlay.",
                            onClose: () => setSelectedEditorialSlideId(""),
                            onSaveDraft: () => {
                              void saveDraft();
                            },
                            onSaveAndPublish: () => {
                              void publishDraft();
                            },
                            children: (
                              <div className="space-y-4">
                                <label className="space-y-2">
                                  <span className="text-sm font-semibold">Intro eyebrow</span>
                                  <input value={draft.editorial.introEyebrow} onChange={(e) => patchDraft("editorial", { introEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                                </label>
                                <label className="space-y-2">
                                  <span className="text-sm font-semibold">Page title</span>
                                  <textarea value={draft.editorial.pageTitle} onChange={(e) => patchDraft("editorial", { pageTitle: e.target.value })} rows={2} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                                </label>
                                <label className="space-y-2">
                                  <span className="text-sm font-semibold">Slider title</span>
                                  <input value={draft.editorial.sliderTitle} onChange={(e) => patchDraft("editorial", { sliderTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" />
                                </label>
                                {selectedEditorialSlide.imageUrl ? (
                                  <img
                                    src={selectedEditorialSlide.imageUrl}
                                    alt={selectedEditorialSlide.headline}
                                    className="h-32 w-full rounded-3xl object-cover"
                                    onError={(event) => {
                                      event.currentTarget.src = withBasePath("/logo.png");
                                    }}
                                  />
                                ) : (
                                  <div className={`h-32 rounded-3xl ${selectedEditorialSlide.palette}`} />
                                )}
                                <div className="grid gap-4 md:grid-cols-2">
                                  <label className="space-y-2"><span className="text-sm font-semibold">Eyebrow</span><input value={selectedEditorialSlide.eyebrow} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { eyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Badge</span><select value={selectedEditorialSlide.badge ?? "New"} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { badge: e.target.value })} className="fa-input fa-select w-full">{slideBadgeOptions.map((option: any) => <option key={option} value={option}>{option}</option>)}</select></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Primary CTA</span><input value={selectedEditorialSlide.primaryCta} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { primaryCta: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2">
                                    <span className="text-sm font-semibold">Primary CTA destination</span>
                                    <select
                                      value={selectedEditorialSlide.primaryCtaHref ?? ""}
                                      onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { primaryCtaHref: e.target.value || undefined })}
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
                                  <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Headline</span><textarea value={selectedEditorialSlide.headline} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { headline: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Subtext</span><textarea value={selectedEditorialSlide.subtext} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { subtext: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Secondary CTA</span><input value={selectedEditorialSlide.secondaryCta} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { secondaryCta: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2">
                                    <span className="text-sm font-semibold">Secondary CTA destination</span>
                                    <select
                                      value={selectedEditorialSlide.secondaryCtaHref ?? ""}
                                      onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { secondaryCtaHref: e.target.value || undefined })}
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
                                  <label className="space-y-2"><span className="text-sm font-semibold">Accent class</span><input value={selectedEditorialSlide.accent} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { accent: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Visual palette</span><textarea value={selectedEditorialSlide.palette} onChange={(e) => patchEditorialSlide(selectedEditorialSlide.id, { palette: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <div className="space-y-2 md:col-span-2">
                                    <span className="text-sm font-semibold">Slide image</span>
                                    <div className="flex flex-wrap gap-2">
                                      <button type="button" onClick={() => setSlideMediaTarget({ scope: "editorial", slideId: selectedEditorialSlide.id })} className="fa-btn fa-btn-ghost rounded-full px-4 py-2 text-xs">
                                        {selectedEditorialSlide.imageUrl ? "Replace image" : "Choose image"}
                                      </button>
                                      {selectedEditorialSlide.imageUrl ? (
                                        <button type="button" onClick={() => patchEditorialSlide(selectedEditorialSlide.id, { imageUrl: undefined })} className="fa-btn fa-btn-danger-soft rounded-full px-4 py-2 text-xs">
                                          Remove image
                                        </button>
                                      ) : null}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 break-all">
                                      {selectedEditorialSlide.imageUrl || "No custom image selected. Generated visual fallback will be used."}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        : null}
                    </div>
                  )}
                  {selectedEditorialPanel === "chapters" && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <div className="fa-card p-5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Chapter editor</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="space-y-2"><span className="text-sm font-semibold">Chapter two title</span><input value={draft.editorial.chapterTwoTitle} onChange={(e) => patchDraft("editorial", { chapterTwoTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Chapter CTA</span><input value={draft.editorial.chapterCtaLabel} onChange={(e) => patchDraft("editorial", { chapterCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Chapter three title</span><input value={draft.editorial.chapterThreeTitle} onChange={(e) => patchDraft("editorial", { chapterThreeTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Intro headline</span><textarea value={draft.editorial.introHeadline} onChange={(e) => patchDraft("editorial", { introHeadline: e.target.value })} rows={2} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Intro note</span><textarea value={draft.editorial.introNote} onChange={(e) => patchDraft("editorial", { introNote: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Campaign notes title</span><input value={draft.editorial.campaignNotesTitle} onChange={(e) => patchDraft("editorial", { campaignNotesTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Chapter feature title</span><input value={draft.editorial.chapterTwoFeatureTitle} onChange={(e) => patchDraft("editorial", { chapterTwoFeatureTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Campaign notes paragraph 1</span><textarea value={draft.editorial.campaignNotesNoteOne} onChange={(e) => patchDraft("editorial", { campaignNotesNoteOne: e.target.value })} rows={2} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Campaign notes paragraph 2</span><textarea value={draft.editorial.campaignNotesNoteTwo} onChange={(e) => patchDraft("editorial", { campaignNotesNoteTwo: e.target.value })} rows={2} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Chapter feature note</span><textarea value={draft.editorial.chapterTwoFeatureNote} onChange={(e) => patchDraft("editorial", { chapterTwoFeatureNote: e.target.value })} rows={2} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Chapter story title</span><textarea value={draft.editorial.chapterStoryTitle} onChange={(e) => patchDraft("editorial", { chapterStoryTitle: e.target.value })} rows={2} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Chapter story description</span><textarea value={draft.editorial.chapterStoryDescription} onChange={(e) => patchDraft("editorial", { chapterStoryDescription: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Focus label</span><input value={draft.editorial.chapterStoryFocusLabel} onChange={(e) => patchDraft("editorial", { chapterStoryFocusLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Goal label</span><input value={draft.editorial.chapterStoryGoalLabel} onChange={(e) => patchDraft("editorial", { chapterStoryGoalLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Action label</span><input value={draft.editorial.chapterStoryActionLabel} onChange={(e) => patchDraft("editorial", { chapterStoryActionLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Related strip title</span><input value={draft.editorial.relatedStripTitle} onChange={(e) => patchDraft("editorial", { relatedStripTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Related strip subtitle</span><input value={draft.editorial.relatedStripSubtitle} onChange={(e) => patchDraft("editorial", { relatedStripSubtitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Final feature title</span><input value={draft.editorial.finalChapterFeatureTitle} onChange={(e) => patchDraft("editorial", { finalChapterFeatureTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Final chapter title</span><input value={draft.editorial.finalChapterTitle} onChange={(e) => patchDraft("editorial", { finalChapterTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Final feature note</span><textarea value={draft.editorial.finalChapterFeatureNote} onChange={(e) => patchDraft("editorial", { finalChapterFeatureNote: e.target.value })} rows={2} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Final chapter description</span><textarea value={draft.editorial.finalChapterDescription} onChange={(e) => patchDraft("editorial", { finalChapterDescription: e.target.value })} rows={2} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <div className="fa-card p-4 md:col-span-2">
                            <div className="text-sm font-semibold">Editorial images</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {([
                                "introPrimaryImage",
                                "introSecondaryImage",
                                "introTertiaryImage",
                                "campaignNotesImage",
                                "chapterTwoPrimaryImage",
                                "chapterTwoSecondaryImage",
                                "chapterTwoTertiaryImage",
                                "finalChapterPrimaryImage",
                                "finalChapterSecondaryImage",
                                "finalChapterTertiaryImage"
                              ] as const).map((field) => (
                                <div key={field} className="rounded-2xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{editorialMediaFieldLabels[field]}</div>
                                  {draft.editorial[field] ? (
                                    <img
                                      src={draft.editorial[field]}
                                      alt={editorialMediaFieldLabels[field]}
                                      className="mt-2 h-24 w-full rounded-xl object-cover"
                                      onError={(event) => {
                                        event.currentTarget.src = withBasePath("/logo.png");
                                      }}
                                    />
                                  ) : (
                                    <div className="mt-2 h-24 w-full rounded-xl border border-dashed border-black/12 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03]" />
                                  )}
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setEditorialMediaField(field)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">{draft.editorial[field] ? "Replace" : "Choose"}</button>
                                    {draft.editorial[field] ? (
                                      <button type="button" onClick={() => patchDraft("editorial", { [field]: "" })} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1 text-[10px]">Clear</button>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-5 fa-card p-4">
                          <div className="text-sm font-semibold">Chapter products</div>
                          <div className="mt-3 max-h-[40dvh] md:max-h-[18rem] space-y-3 overflow-y-auto pr-1">
                            {editorialChapterTwoProducts.map((product: any, index: number) => (
                              <div key={product.id} className="rounded-2xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs text-slate-500 dark:text-slate-400">Chapter pick {index + 1}</div>
                                    <div className="mt-1 font-semibold">{product.name}</div>
                                  </div>
                                  <div className={`h-12 w-12 shrink-0 rounded-2xl ${product.palette}`} />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button type="button" onClick={() => setProductPickerTarget({ scope: "editorial-chapter", index })} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Edit</button>
                                  <button type="button" onClick={() => setProductPickerTarget({ scope: "editorial-chapter", index })} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Replace</button>
                                  <button type="button" onClick={() => removeEditorialListProduct(setEditorialChapterProductIds, index)} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1 text-[10px]">Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="fa-card p-5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Related story strip</p>
                        <div className="mt-4 max-h-[50dvh] md:max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                          {editorialRelatedStoryProducts.map((product: any, index: number) => (
                            <div key={product.id} className="fa-card p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Strip item {index + 1}</div>
                                  <div className="mt-1 font-semibold">{product.name}</div>
                                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.collection} • {product.category}</div>
                                </div>
                                <div className={`h-16 w-14 shrink-0 rounded-2xl ${product.palette}`} />
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={() => setProductPickerTarget({ scope: "editorial-related", index })} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Edit</button>
                                <button type="button" onClick={() => moveEditorialListProduct(setEditorialRelatedProductIds, index, index === 0 ? 1 : -1)} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Move</button>
                                <button type="button" onClick={() => removeEditorialListProduct(setEditorialRelatedProductIds, index)} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1 text-[10px]">Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedEditorialPanel === "story-cta" && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <div className="fa-card p-5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Story conversion</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="space-y-2"><span className="text-sm font-semibold">Shop story eyebrow</span><input value={draft.editorial.shopStoryEyebrow} onChange={(e) => patchDraft("editorial", { shopStoryEyebrow: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2"><span className="text-sm font-semibold">Shop story title</span><input value={draft.editorial.shopStoryTitle} onChange={(e) => patchDraft("editorial", { shopStoryTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Story CTA</span><input value={draft.editorial.storyCtaLabel} onChange={(e) => patchDraft("editorial", { storyCtaLabel: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Story title</span><input value={draft.editorial.storyTitle} onChange={(e) => patchDraft("editorial", { storyTitle: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Story note</span><textarea value={draft.editorial.storyNote} onChange={(e) => patchDraft("editorial", { storyNote: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                          <div className="fa-card p-4 md:col-span-2">
                            <div className="text-sm font-semibold">Grouped story picks</div>
                            <div className="mt-3 max-h-[40dvh] md:max-h-[18rem] space-y-3 overflow-y-auto pr-1">
                              {editorialProducts.map((product: any, index: number) => (
                                <div key={product.id} className="rounded-2xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs text-slate-500 dark:text-slate-400">Story product {index + 1}</div>
                                      <div className="mt-1 font-semibold">{product.name}</div>
                                    </div>
                                    <div className={`h-12 w-12 shrink-0 rounded-2xl ${product.palette}`} />
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setProductPickerTarget({ scope: "editorial-story", index })} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Edit</button>
                                    <button type="button" onClick={() => setProductPickerTarget({ scope: "editorial-story", index })} className="fa-btn fa-btn-ghost rounded-full px-3 py-1 text-[10px]">Replace</button>
                                    <button type="button" onClick={() => removeEditorialListProduct(setEditorialStoryProductIds, index)} className="fa-btn fa-btn-danger-soft rounded-full px-3 py-1 text-[10px]">Delete</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="fa-card p-5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Conversion notes</p>
                        <div className="mt-4 space-y-4">
                          <div className="rounded-2xl border border-black/8 bg-white/70 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            Use this panel to control the grouped editorial WhatsApp action. Keep the story picks tight and let the product list scroll internally so the admin page stays stable.
                          </div>
                          <button type="button" onClick={previewEditorialStoryCta} className="fa-btn fa-btn-primary rounded-full px-4 py-2 text-xs">Preview story CTA</button>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
  );
};

export default EditorialStudioWorkspace;







