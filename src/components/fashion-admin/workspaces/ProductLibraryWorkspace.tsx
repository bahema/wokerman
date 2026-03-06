import type { ReactNode } from "react";
import type { FashionBossDraft } from "../../../utils/fashionDraft";
import type { FashionProduct } from "../../../data/fashionCatalog";
import type { FashionCurrencyCode, FashionLocaleCode } from "../../../utils/fashionPricing";

type DraftSection = "homepage" | "collections" | "editorial" | "styleNotes" | "pricing" | "whatsapp";
type PatchDraft = <K extends DraftSection>(section: K, value: Partial<FashionBossDraft[K]>) => void;
import { fashionCurrencyOptions } from "../../../utils/fashionPricing";
import { fashionLocaleOptions } from "../../../utils/fashionPricing";

type ProductEditorOverlayArgs = {
  title: string;
  description: string;
  onClose: () => void;
  onSaveDraft: () => void;
  onSaveAndPublish: () => void;
  children: ReactNode;
  widthClass?: string;
};

type ProductDraftState = {
  id: string;
  name: string;
  collection: string;
  category: string;
  price: string;
  whatsappNumber: string;
  material: string;
  fit: string;
  occasion: string;
  availabilityLabel: string;
  note: string;
  styleTags: string;
  badgeType: string;
  bundleIds: string;
  badge: string;
  primaryImage: string;
  detailImage: string;
  stylingImage: string;
};

type ProductFieldOptions = {
  collections: string[];
  categories: string[];
  materials: string[];
  fits: string[];
  occasions: string[];
  availabilityLabels: string[];
  styleTags: string[];
  bundleIds: string[];
};

type ProductLibraryWorkspaceProps = {
  renderSectionActionBar: (section: string) => ReactNode;
  productSearch: string;
  setProductSearch: (value: string) => void;
  allProducts: FashionProduct[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  startNewProductDraft: () => void;
  productDraft: ProductDraftState;
  patchProductDraft: (value: Partial<ProductDraftState>) => void;
  draft: FashionBossDraft;
  patchDraft: PatchDraft;
  saveProductDraft: () => void;
  resetProductDraft: () => void;
  productDraftSavedAt: string | null;
  setMediaPickerSlot: (slot: "primaryImage" | "detailImage" | "stylingImage" | null) => void;
  selectedProduct: FashionProduct | null;
  filteredProducts: FashionProduct[];
  NEW_PRODUCT_ID: string;
  renderEditorOverlay: (args: ProductEditorOverlayArgs) => ReactNode;
  saveCurrentProductToRemote: (mode: "save" | "publish") => Promise<void>;
  formatBadgeLabel: (value: string) => string;
  productBadgeOptions: readonly string[];
  productFieldOptions: ProductFieldOptions;
};

const ProductLibraryWorkspace = (props: ProductLibraryWorkspaceProps) => {
  const {
    renderSectionActionBar,
    productSearch,
    setProductSearch,
    allProducts,
    selectedProductId,
    setSelectedProductId,
    startNewProductDraft,
    productDraft,
    patchProductDraft,
    draft,
    patchDraft,
    saveProductDraft,
    resetProductDraft,
    productDraftSavedAt,
    setMediaPickerSlot,
    selectedProduct,
    filteredProducts,
    NEW_PRODUCT_ID,
    renderEditorOverlay,
    saveCurrentProductToRemote,
    formatBadgeLabel,
    productBadgeOptions,
    productFieldOptions
  } = props;

  return (                  <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <div className="xl:col-span-3">{renderSectionActionBar("Products")}</div>
                    <div className="space-y-4 rounded-[1.8rem] border border-black/8 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(247,238,228,0.76))] p-4 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Catalog queue</p>
                          <h3 className="mt-1 text-lg font-black">Product library</h3>
                        </div>
                        <button type="button" onClick={startNewProductDraft} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                          New product
                        </button>
                      </div>
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Search products</span>
                        <input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Name, collection, tag"
                          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"
                        />
                      </label>
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        <div className="rounded-2xl border border-black/8 bg-white/75 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5">{filteredProducts.length} visible</div>
                        <div className="rounded-2xl border border-black/8 bg-white/75 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5">{allProducts.filter((item: any) => item.badgeType).length} tagged</div>
                        <div className="rounded-2xl border border-black/8 bg-white/75 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5">{allProducts.filter((item: any) => item.bundleIds?.length).length} linked</div>
                      </div>
                      <div className="max-h-[56dvh] md:max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                        {filteredProducts.map((product: any) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => setSelectedProductId(product.id)}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                              selectedProductId === product.id
                                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                                : "border-black/6 bg-white/60 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold">{product.name}</div>
                                <div className={`mt-1 text-xs ${selectedProductId === product.id ? "text-white/70 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>{product.collection}</div>
                              </div>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${selectedProductId === product.id ? "bg-white/12 text-white/85 dark:bg-slate-900/10 dark:text-slate-900" : "bg-black/5 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}>
                                {product.category}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {selectedProduct || selectedProductId === NEW_PRODUCT_ID
                      ? renderEditorOverlay({
                          title: productDraft.name || "Product Editor",
                          description: "Edit or add a product in a closable overlay, then save the draft or publish directly.",
                          onClose: () => setSelectedProductId(""),
                          onSaveDraft: () => {
                            void saveCurrentProductToRemote("save");
                          },
                          onSaveAndPublish: () => {
                            void saveCurrentProductToRemote("publish");
                          },
                          widthClass: "max-w-6xl",
                          children: (
                            <div className="grid gap-5 xl:grid-cols-[1.1fr_minmax(0,0.9fr)]">
                              <div className="space-y-4 fa-card p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Editor panel</p>
                                    <h3 className="mt-1 text-lg font-black">{productDraft.name || "New product draft"}</h3>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {productDraftSavedAt ? <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Saved {productDraftSavedAt}</span> : null}
                                    <button type="button" onClick={resetProductDraft} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">Reset</button>
                                    <button type="button" onClick={saveProductDraft} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">Save changes</button>
                                  </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <label className="space-y-2"><span className="text-sm font-semibold">Product name</span><input value={productDraft.name} onChange={(e) => patchProductDraft({ name: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Collection</span><input list="fashion-product-collections" value={productDraft.collection} onChange={(e) => patchProductDraft({ collection: e.target.value })} placeholder="Choose or type a collection" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /><datalist id="fashion-product-collections">{productFieldOptions.collections.map((option) => <option key={option} value={option} />)}</datalist></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Category</span><input list="fashion-product-categories" value={productDraft.category} onChange={(e) => patchProductDraft({ category: e.target.value })} placeholder="Choose or type a category" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /><datalist id="fashion-product-categories">{productFieldOptions.categories.map((option) => <option key={option} value={option} />)}</datalist></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Price</span><input value={productDraft.price} onChange={(e) => patchProductDraft({ price: e.target.value })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2 md:col-span-2">
                                    <span className="text-sm font-semibold">WhatsApp number override</span>
                                    <input
                                      value={productDraft.whatsappNumber}
                                      onChange={(e) => patchProductDraft({ whatsappNumber: e.target.value })}
                                      placeholder="+1 202 555 0123"
                                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Add a number to force direct <span className="font-semibold">wa.me</span> open for this product CTA. If left empty, CTA follows the current global WhatsApp system.
                                    </p>
                                  </label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Display currency</span><select value={draft.pricing.currency} onChange={(e) => patchDraft("pricing", { currency: e.target.value as FashionCurrencyCode })} className="fa-input fa-select w-full">{fashionCurrencyOptions.map((option: any) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Display locale</span><select value={draft.pricing.locale ?? "en-US"} onChange={(e) => patchDraft("pricing", { locale: e.target.value as FashionLocaleCode })} className="fa-input fa-select w-full">{fashionLocaleOptions.map((option: any) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Market label</span><input value={draft.pricing.marketLabel ?? ""} onChange={(e) => patchDraft("pricing", { marketLabel: e.target.value })} placeholder="Global, East Africa, Europe" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Related suggestions</span><input type="number" min={1} max={6} value={draft.pricing.relatedProductLimit ?? 3} onChange={(e) => patchDraft("pricing", { relatedProductLimit: Math.max(1, Math.min(6, Number(e.target.value) || 3)) })} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2 md:col-span-2">
                                    <span className="text-sm font-semibold">Page deduplication</span>
                                    <button
                                      type="button"
                                      onClick={() => patchDraft("pricing", { enforceUniquePerPage: !(draft.pricing.enforceUniquePerPage ?? true) })}
                                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${draft.pricing.enforceUniquePerPage ?? true ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-black/10 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"}`}
                                    >
                                      {draft.pricing.enforceUniquePerPage ?? true ? "Enabled: each product appears once per page" : "Disabled: sections can reuse products"}
                                    </button>
                                  </label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Badge label</span><input value={productDraft.badge} onChange={(e) => patchProductDraft({ badge: e.target.value })} placeholder="New, Limited, Editor Pick" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Material</span><input list="fashion-product-materials" value={productDraft.material} onChange={(e) => patchProductDraft({ material: e.target.value })} placeholder="Choose or type material" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /><datalist id="fashion-product-materials">{productFieldOptions.materials.map((option) => <option key={option} value={option} />)}</datalist></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Fit</span><input list="fashion-product-fits" value={productDraft.fit} onChange={(e) => patchProductDraft({ fit: e.target.value })} placeholder="Choose or type fit" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /><datalist id="fashion-product-fits">{productFieldOptions.fits.map((option) => <option key={option} value={option} />)}</datalist></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Occasion</span><input list="fashion-product-occasions" value={productDraft.occasion} onChange={(e) => patchProductDraft({ occasion: e.target.value })} placeholder="Choose or type occasion" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /><datalist id="fashion-product-occasions">{productFieldOptions.occasions.map((option) => <option key={option} value={option} />)}</datalist></label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Availability</span><input list="fashion-product-availability" value={productDraft.availabilityLabel} onChange={(e) => patchProductDraft({ availabilityLabel: e.target.value })} placeholder="Choose or type availability" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /><datalist id="fashion-product-availability">{productFieldOptions.availabilityLabels.map((option) => <option key={option} value={option} />)}</datalist></label>
                                  <label className="space-y-2">
                                    <span className="text-sm font-semibold">Badge type</span>
                                    <select
                                      value={productDraft.badgeType}
                                      onChange={(e) =>
                                        patchProductDraft({
                                          badgeType: e.target.value,
                                          badge: productDraft.badge.trim() ? productDraft.badge : formatBadgeLabel(e.target.value)
                                        })
                                      }
                                      className="fa-input fa-select w-full"
                                    >
                                      {productBadgeOptions.map((option: any) => (
                                        <option key={option} value={option}>
                                          {formatBadgeLabel(option)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="space-y-2"><span className="text-sm font-semibold">Bundle ids</span><input list="fashion-product-bundle-ids" value={productDraft.bundleIds} onChange={(e) => patchProductDraft({ bundleIds: e.target.value })} placeholder="Comma-separated bundle ids" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /><datalist id="fashion-product-bundle-ids">{productFieldOptions.bundleIds.map((option) => <option key={option} value={option} />)}</datalist></label>
                                  <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Promotion note</span><textarea value={productDraft.note} onChange={(e) => patchProductDraft({ note: e.target.value })} rows={3} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /></label>
                                  <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Style tags</span><input list="fashion-product-style-tags" value={productDraft.styleTags} onChange={(e) => patchProductDraft({ styleTags: e.target.value })} placeholder="Comma-separated tags (e.g. tailoring, smart, office)" className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5" /><datalist id="fashion-product-style-tags">{productFieldOptions.styleTags.map((option) => <option key={option} value={option} />)}</datalist></label>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="fa-card p-4">
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Image slots</p>
                                  <div className="mt-4 space-y-3">
                                    {([
                                      ["Primary", "primaryImage", productDraft.primaryImage],
                                      ["Detail", "detailImage", productDraft.detailImage],
                                      ["Styling", "stylingImage", productDraft.stylingImage]
                                    ] as const).map(([label, key, value]) => (
                                      <div key={label} className="space-y-2 rounded-2xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                                        {value ? (
                                          <div className="h-24 overflow-hidden rounded-2xl border border-black/8 bg-slate-100 dark:border-white/10 dark:bg-white/5">
                                            <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" />
                                          </div>
                                        ) : (
                                          <div className={`flex h-24 items-center justify-center rounded-2xl text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 ${selectedProduct?.palette ?? "bg-[linear-gradient(140deg,#f5ede3,#d6b497_58%,#8c694e)] dark:bg-[linear-gradient(140deg,#201813,#604733_58%,#c49a72)]"}`}>
                                            {label} preview
                                          </div>
                                        )}
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</span>
                                          <div className="flex gap-2">
                                            <button type="button" onClick={() => setMediaPickerSlot(key)} className="fa-btn fa-btn-ghost rounded-full px-2.5 py-1 text-[10px]">Choose</button>
                                            <button type="button" onClick={() => patchProductDraft({ [key]: "" })} className="fa-btn fa-btn-danger-soft rounded-full px-2.5 py-1 text-[10px]">Clear</button>
                                          </div>
                                        </div>
                                        <div className="rounded-2xl border border-dashed border-black/12 px-3 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                                          Choose from the uploaded media library. Product editors do not pull images directly from the computer here.
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="fa-card p-4">
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Product usage</p>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {productDraft.badge ? <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">{productDraft.badge}</span> : null}
                                    {productDraft.badgeType ? <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">{productDraft.badgeType}</span> : null}
                                    {productDraft.bundleIds.split(",").map((bundleId: string) => bundleId.trim()).filter(Boolean).map((bundleId: string) => (
                                      <span key={bundleId} className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">{bundleId}</span>
                                    ))}
                                    {productDraft.category ? <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">{productDraft.category}</span> : null}
                                    {productDraft.whatsappNumber.trim() ? <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">WA override</span> : null}
                                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">{draft.pricing.currency}</span>
                                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">{draft.pricing.locale ?? "en-US"}</span>
                                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold dark:bg-white/10">{draft.pricing.marketLabel ?? "Global"}</span>
                                  </div>
                                  <div className="mt-4 rounded-2xl border border-dashed border-black/12 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
                                    Product metadata here feeds homepage cards, collections, editorial picks, style sets, and WhatsApp inquiry captions.
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      : null}
                  </div>
  );
};

export default ProductLibraryWorkspace;







