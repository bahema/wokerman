import { apiJson } from "../api/client";
import type { FashionProduct } from "../data/fashionCatalog";
import { getFashionClientViewModel } from "./fashionDraft";
import {
  buildFitCheckoutMessage,
  buildLookWhatsAppMessage,
  buildProductCheckoutMessage,
  getFashionWhatsAppNumber
} from "./fashionWhatsApp";

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
      ? buildFitCheckoutMessage(product, vm.whatsapp, source, sheet.notes.trim()).message
      : buildProductCheckoutMessage(product, vm.whatsapp, source, sheet.notes.trim()).message;

  return submitFashionRichInquiry({
    type: mode,
    source,
    message,
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
  const message = buildLookWhatsAppMessage(title, items, vm.whatsapp, source, sheet.notes.trim());

  return submitFashionRichInquiry({
    type: "look",
    source,
    message,
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
