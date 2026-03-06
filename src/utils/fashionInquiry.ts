import { apiJson } from "../api/client";
import type { FashionProduct } from "../data/fashionCatalog";
import { formatFashionPrice } from "./fashionPricing";
import { getFashionClientViewModel } from "./fashionDraft";
import { getFashionWhatsAppNumber } from "./fashionWhatsApp";
import { withBasePath } from "./basePath";

type FashionRichInquiryType = "product" | "fit" | "look" | "collection" | "editorial-story" | "style-set";

export type FashionInquirySheetInput = {
  customerName: string;
  phoneNumber: string;
  countryCode: string;
  preferredContactMethod: string;
  notes: string;
  consentAccepted: boolean;
};

type FashionInquiryProductPayload = {
  id: string;
  name: string;
  collection?: string;
  category?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
};

type FashionRichInquiryPayload = {
  type: FashionRichInquiryType;
  source: string;
  message: string;
  imageUrl?: string;
  products: FashionInquiryProductPayload[];
  customerMeta: {
    name?: string;
    phoneNumber: string;
    countryCode?: string;
    preferredContactMethod?: string;
    notes?: string;
  };
  consent: {
    accepted: boolean;
    text?: string;
  };
  fallbackPhoneNumber?: string;
};

type FashionInquiryApiResponse = {
  ok?: boolean;
  inquiryId?: string;
  deliveryMode?: "api-image" | "api-text" | "fallback-required";
  fallbackWaMeUrl?: string;
  error?: string;
};

export type FashionRichInquiryResult = {
  ok: boolean;
  inquiryId?: string;
  deliveryMode: "api-image" | "api-text" | "fallback-required";
  fallbackUsed: boolean;
  error?: string;
};

const normalizeDigits = (value: string) => value.replace(/\D/g, "");
const resolveProductDeepLink = (productId: string) => {
  const relative = withBasePath(`/fashion/collections?focusProduct=${encodeURIComponent(productId)}`);
  if (typeof window === "undefined") return relative;
  return new URL(relative, `${window.location.origin}/`).toString();
};

const toProductPayload = (product: FashionProduct, currency: string): FashionInquiryProductPayload => ({
  id: product.id,
  name: product.name,
  collection: product.collection,
  category: product.category,
  price: product.price,
  currency,
  imageUrl: product.primaryImage || product.detailImage || product.stylingImage
});

const buildFallbackWaMeUrl = (phoneNumber: string, message: string) => {
  const normalized = normalizeDigits(phoneNumber);
  if (!normalized) return "";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

const openWaMeFallback = (url: string) => {
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
};

export const submitFashionRichInquiry = async (payload: FashionRichInquiryPayload): Promise<FashionRichInquiryResult> => {
  const fallbackPhone = payload.fallbackPhoneNumber || getFashionWhatsAppNumber();
  const fallbackUrl = buildFallbackWaMeUrl(fallbackPhone, payload.message);

  try {
    const response = await apiJson<FashionInquiryApiResponse>("/api/fashion/whatsapp/inquiries", "POST", payload);
    const deliveryMode = response.deliveryMode ?? "fallback-required";
    const serverFallback = response.fallbackWaMeUrl || fallbackUrl;

    if (deliveryMode === "fallback-required" || response.ok !== true) {
      const fallbackUsed = openWaMeFallback(serverFallback);
      return {
        ok: false,
        inquiryId: response.inquiryId,
        deliveryMode,
        fallbackUsed,
        error: response.error || "Fallback to quick WhatsApp chat was required."
      };
    }

    return {
      ok: true,
      inquiryId: response.inquiryId,
      deliveryMode,
      fallbackUsed: false
    };
  } catch (error) {
    const fallbackUsed = openWaMeFallback(fallbackUrl);
    return {
      ok: false,
      deliveryMode: "fallback-required",
      fallbackUsed,
      error: error instanceof Error ? error.message : "Rich inquiry failed."
    };
  }
};

const buildCommonCustomerMeta = (sheet: FashionInquirySheetInput) => ({
  name: sheet.customerName.trim() || undefined,
  phoneNumber: normalizeDigits(sheet.phoneNumber),
  countryCode: sheet.countryCode.trim() || undefined,
  preferredContactMethod: sheet.preferredContactMethod.trim() || undefined,
  notes: sheet.notes.trim() || undefined
});

export const submitRichProductInquiry = async (
  product: FashionProduct,
  source: string,
  sheet: FashionInquirySheetInput,
  mode: "product" | "fit"
): Promise<FashionRichInquiryResult> => {
  const vm = getFashionClientViewModel();
  const imageUrl = product.primaryImage || product.detailImage || product.stylingImage;
  const message =
    mode === "fit"
      ? [
          `Hello, I need fit and sizing guidance for ${product.name}.`,
          `Collection: ${product.collection}.`,
          `Fit: ${product.fit}.`,
          `Occasion: ${product.occasion}.`,
          `Price: ${formatFashionPrice(product.price)}.`,
          `Product link: ${resolveProductDeepLink(product.id)}.`,
          `CTA: ${vm.whatsapp.fitCta}.`,
          `Source: ${source}.`,
          sheet.notes.trim() ? `Customer notes: ${sheet.notes.trim()}.` : null
        ]
      : [
          product.whatsappNote || `Hello, I want this fashion item: ${product.name}.`,
          `Collection: ${product.collection}.`,
          `Category: ${product.category}.`,
          `Price: ${formatFashionPrice(product.price)}.`,
          `Tone: ${product.tone}.`,
          `Occasion: ${product.occasion}.`,
          `Product link: ${resolveProductDeepLink(product.id)}.`,
          `CTA: ${vm.whatsapp.productCta}.`,
          `Source: ${source}.`,
          sheet.notes.trim() ? `Customer notes: ${sheet.notes.trim()}.` : null
        ];

  return submitFashionRichInquiry({
    type: mode,
    source,
    message: message.filter(Boolean).join(" "),
    imageUrl,
    products: [toProductPayload(product, vm.pricing.currency)],
    customerMeta: buildCommonCustomerMeta(sheet),
    consent: {
      accepted: sheet.consentAccepted,
      text: "Customer consented to WhatsApp inquiry messaging."
    },
    fallbackPhoneNumber: vm.whatsapp.phoneNumber
  });
};

export const submitRichLookInquiry = async (
  title: string,
  items: FashionProduct[],
  source: string,
  sheet: FashionInquirySheetInput
): Promise<FashionRichInquiryResult> => {
  const vm = getFashionClientViewModel();
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const lines = [
    `Hello, I want this look: ${title}.`,
    ...items.flatMap((item) => [`${item.name} - ${formatFashionPrice(item.price)}.`, `Product link: ${resolveProductDeepLink(item.id)}.`]),
    `Reference total: ${formatFashionPrice(total)}.`,
    `CTA: ${vm.whatsapp.lookCta}.`,
    `Source: ${source}.`,
    sheet.notes.trim() ? `Customer notes: ${sheet.notes.trim()}.` : null
  ];

  return submitFashionRichInquiry({
    type: "look",
    source,
    message: lines.filter(Boolean).join(" "),
    imageUrl: items[0]?.primaryImage || items[0]?.detailImage || items[0]?.stylingImage,
    products: items.map((item) => toProductPayload(item, vm.pricing.currency)),
    customerMeta: buildCommonCustomerMeta(sheet),
    consent: {
      accepted: sheet.consentAccepted,
      text: "Customer consented to WhatsApp inquiry messaging."
    },
    fallbackPhoneNumber: vm.whatsapp.phoneNumber
  });
};
