import { useEffect, useMemo, useState } from "react";
import ModalShell from "./ModalShell";
import FashionProductImage from "./FashionProductImage";
import type { FashionProduct } from "../data/fashionCatalog";
import {
  getFashionProductFitWhatsAppUrl,
  getFashionProductWhatsAppUrl,
  openFashionFitCheckout,
  openFashionPairSelectionCheckout,
  openFashionProductCheckout
} from "../utils/fashionWhatsApp";
import FashionInquirySheetModal from "./FashionInquirySheetModal";
import { submitRichProductInquiry } from "../utils/fashionInquiry";
import { formatFashionPrice } from "../utils/fashionPricing";
import { getFashionClientViewModel } from "../utils/fashionDraft";
import { getFashionBadgeClassName, getFashionPriceChipClassName } from "../utils/fashionBadge";
import { useFashionPublishedSync } from "../hooks/useFashionPublishedSync";

type FashionProductModalProps = {
  product: FashionProduct | null;
  relatedProducts: FashionProduct[];
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
  sourceLabel?: string;
};

const FashionProductModal = ({ product, relatedProducts, onClose, returnFocusTo, sourceLabel = "Fashion product modal" }: FashionProductModalProps) => {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [selectedPairIds, setSelectedPairIds] = useState<string[]>([]);
  const [isInquirySheetOpen, setIsInquirySheetOpen] = useState(false);
  const [fashionViewModel, setFashionViewModel] = useState(() => getFashionClientViewModel());
  const galleryPanels = useMemo(
    () =>
      product
        ? [
            {
              id: "front",
              variant: "primary" as const,
              label: "Front view",
              description: "Main campaign framing for immediate visual recall."
            },
            {
              id: "detail",
              variant: "detail" as const,
              label: "Detail view",
              description: `Closer emphasis on ${product.material.toLowerCase()} and finish.`
            },
            {
              id: "styling",
              variant: "styling" as const,
              label: "Styling view",
              description: `Positioned for ${product.occasion.toLowerCase()} and ${product.fit.toLowerCase()}.`
            }
          ]
        : [],
    [product]
  );

  useEffect(() => {
    setActiveGalleryIndex(0);
    setSelectedPairIds([]);
    setIsInquirySheetOpen(false);
  }, [product?.id]);

  useFashionPublishedSync(setFashionViewModel, undefined, { pollIntervalMs: 0 });

  if (!product) return null;

  const productUrl = getFashionProductWhatsAppUrl(product, sourceLabel);
  const fitUrl = getFashionProductFitWhatsAppUrl(product, `${sourceLabel} sizing`);
  const quickPairProducts = relatedProducts.slice(0, 2);
  const featuredRelated = relatedProducts[0] ?? null;
  const additionalRelated = relatedProducts.slice(1);
  const activePanel = galleryPanels[activeGalleryIndex] ?? galleryPanels[0];
  const selectedPairProducts = relatedProducts.filter((item) => selectedPairIds.includes(item.id));
  const modalCopy = fashionViewModel.homepage;
  const togglePairProduct = (productId: string) => {
    setSelectedPairIds((current) => (current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]));
  };

  return (
    <ModalShell
      open={Boolean(product)}
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      labelledBy="fashion-product-modal-title"
      title={product.name}
      closeAriaLabel="Close fashion product details"
      maxWidthClassName="max-w-5xl"
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="relative min-h-[19rem] overflow-hidden rounded-[1.8rem]">
            <FashionProductImage
              product={product}
              alt={product.name}
              variant={activePanel.variant}
              className="absolute inset-0 h-full w-full"
              fallbackClassName={product.palette}
              useCrossSlotFallback={false}
              missingLabel={`${activePanel.label} not added`}
            />
            <div className="relative z-10 flex h-full flex-col justify-between rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{activePanel.label}</span>
              <p className="max-w-full text-sm font-semibold leading-6 text-white/86 sm:max-w-[15rem]">{activePanel.description}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {galleryPanels.map((panel, index) => (
              <button
                key={panel.id}
                type="button"
                onClick={() => setActiveGalleryIndex(index)}
                className={`rounded-2xl border p-3 text-left transition ${
                  activeGalleryIndex === index
                    ? "border-white/25 bg-white/10"
                    : "border-white/10 bg-black/10 hover:bg-white/5"
                }`}
              >
                <FashionProductImage
                  product={product}
                  alt={product.name}
                  variant={panel.variant}
                  className="mb-3 h-16 w-full rounded-xl"
                  fallbackClassName={product.palette}
                  useCrossSlotFallback={false}
                  missingLabel={`${panel.label} missing`}
                />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">{panel.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
              {product.collection}
            </span>
            <span className="rounded-full border border-amber-200/15 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-100/85">
              {sourceLabel}
            </span>
            {product.badge ? (
              <span className={getFashionBadgeClassName(product.badgeType, product.badge)}>
                {product.badge}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="break-words text-xl font-black tracking-[-0.03em] sm:text-2xl">{product.name}</p>
            <p className="text-sm leading-7 text-slate-300">{product.note}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {product.category} · {product.occasion}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{modalCopy.modalWhyLabel}</p>
            <p className="mt-2 text-sm leading-7 text-slate-200">
              Built for {product.occasion.toLowerCase()}, this {product.category.toLowerCase()} keeps a {product.fit.toLowerCase()} and
              leans into {product.tone.toLowerCase()} styling for cleaner affiliate promotion and faster WhatsApp conversion.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Price</p>
              <span className={`mt-2 ${getFashionPriceChipClassName(product.badgeType, product.badge)}`}>{formatFashionPrice(product.price)}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Tone</p>
              <p className="mt-2 text-xl font-black">{product.tone}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Material</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{product.material}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Fit</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{product.fit}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Availability</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{product.availabilityLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 xl:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Style tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.styleTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-100">
            {modalCopy.modalCommerceNotice}
          </div>

          {quickPairProducts.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{modalCopy.modalQuickPairEyebrow}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{modalCopy.modalQuickPairNote}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickPairProducts.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <div className="flex items-center gap-3">
                      <FashionProductImage product={item} alt={item.name} className="h-14 w-14 rounded-xl" fallbackClassName={item.palette} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{item.name}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.collection}</p>
                        <span className={`mt-1 ${getFashionPriceChipClassName(item.badgeType, item.badge)}`}>{formatFashionPrice(item.price)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        togglePairProduct(item.id);
                      }}
                      className="mt-3 inline-flex rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white/10"
                    >
                      {selectedPairIds.includes(item.id) ? "Remove from pair" : "Add to pair"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <a
              href={productUrl}
              onClick={(event) => {
                event.preventDefault();
                if (selectedPairProducts.length > 0) {
                  openFashionPairSelectionCheckout(product, selectedPairProducts, `${sourceLabel} paired selection`);
                  return;
                }
                void openFashionProductCheckout(product, sourceLabel);
              }}
              className="inline-flex min-h-[3.35rem] w-full items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-center text-sm font-bold leading-tight text-slate-950 transition hover:bg-emerald-400"
            >
              {selectedPairProducts.length > 0
                ? `${product.ctaLabel ?? "Order on WhatsApp"} with ${selectedPairProducts.length} pair${selectedPairProducts.length === 1 ? "" : "s"}`
                : product.ctaLabel ?? "Order on WhatsApp"}
            </a>
            <a
              href={fitUrl}
              onClick={(event) => {
                event.preventDefault();
                void openFashionFitCheckout(product, `${sourceLabel} sizing`);
              }}
              className="inline-flex min-h-[3.35rem] w-full items-center justify-center rounded-full border border-white/10 bg-black/10 px-5 py-3 text-center text-sm font-semibold leading-tight text-white transition hover:bg-white/10"
            >
              {modalCopy.modalFitCtaLabel}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[3.35rem] w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-semibold leading-tight text-white transition hover:bg-white/10"
            >
              {modalCopy.modalContinueLabel}
            </button>
            <button
              type="button"
              onClick={() => setIsInquirySheetOpen(true)}
              className="min-h-[3.35rem] w-full rounded-full border border-emerald-300/35 bg-emerald-500/10 px-5 py-3 text-center text-sm font-semibold leading-tight text-emerald-100 transition hover:bg-emerald-500/20"
            >
              Send inquiry sheet
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold">{modalCopy.modalPairTitle}</h4>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{modalCopy.modalPairNote}</p>
          </div>
          {selectedPairProducts.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                openFashionPairSelectionCheckout(product, selectedPairProducts, `${sourceLabel} paired selection`);
              }}
              className="rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-400"
            >
              Send {selectedPairProducts.length} paired item{selectedPairProducts.length === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
        {relatedProducts.length > 0 ? (
          <div className="space-y-4">
            {featuredRelated ? (
              <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 lg:grid-cols-[0.9fr_1.1fr]">
                <FashionProductImage product={featuredRelated} alt={featuredRelated.name} className="min-h-[12rem] w-full rounded-xl" fallbackClassName={featuredRelated.palette} />
                <div className="flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{modalCopy.modalFeaturedRelatedLabel}</p>
                    <p className="mt-2 text-lg font-bold">{featuredRelated.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      {featuredRelated.collection} · {featuredRelated.tone}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{featuredRelated.note}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={getFashionPriceChipClassName(featuredRelated.badgeType, featuredRelated.badge)}>{formatFashionPrice(featuredRelated.price)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        togglePairProduct(featuredRelated.id);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition ${
                        selectedPairIds.includes(featuredRelated.id)
                          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
                          : "border-white/10 text-white hover:bg-white/10"
                      }`}
                    >
                      {selectedPairIds.includes(featuredRelated.id) ? "Selected" : "Add to pair"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void openFashionProductCheckout(featuredRelated, "Fashion related featured");
                      }}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white/10"
                    >
                      Ask
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {additionalRelated.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {additionalRelated.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <FashionProductImage product={item} alt={item.name} className="h-36 w-full rounded-xl" fallbackClassName={item.palette} />
                    <p className="mt-3 text-sm font-bold">{item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      {item.collection} · {item.tone}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className={getFashionPriceChipClassName(item.badgeType, item.badge)}>{formatFashionPrice(item.price)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            togglePairProduct(item.id);
                          }}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition ${
                            selectedPairIds.includes(item.id)
                              ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
                              : "border-white/10 text-white hover:bg-white/10"
                          }`}
                        >
                          {selectedPairIds.includes(item.id) ? "Selected" : "Add"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void openFashionProductCheckout(item, "Fashion related products");
                          }}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white/10"
                        >
                          Ask
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 sm:col-span-2 lg:col-span-3">
            {modalCopy.modalEmptyRelatedNote}
          </div>
        )}
      </div>

      <FashionInquirySheetModal
        open={isInquirySheetOpen}
        onClose={() => setIsInquirySheetOpen(false)}
        returnFocusTo={returnFocusTo}
        title="Structured inquiry"
        subtitle="Send a richer inquiry record with optional image delivery while keeping quick chat fallback."
        inquiryOptions={[
          { id: "product", label: "Product inquiry" },
          { id: "fit", label: "Fit guidance inquiry" }
        ]}
        defaultInquiryType="product"
        submitLabel="Send inquiry"
        onSubmit={async (sheet) => {
          const mode = sheet.inquiryType === "fit" ? "fit" : "product";
          const result = await submitRichProductInquiry(product, sourceLabel, sheet, mode);
          return {
            ok: result.ok,
            message:
              result.ok
                ? "Inquiry sent successfully."
                : result.fallbackUsed
                  ? "API send was unavailable. Opened quick WhatsApp fallback."
                  : result.error || "Unable to send inquiry."
          };
        }}
      />
    </ModalShell>
  );
};

export default FashionProductModal;
