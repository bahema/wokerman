import type { FashionProduct } from "../data/fashionCatalog";
import { apiJson } from "../api/client";
import { withBasePath } from "./basePath";
import { buildFashionClientViewModel, getFashionClientViewModel, getPublishedFashionContentAsync } from "./fashionDraft";
import { formatFashionPrice } from "./fashionPricing";

const FALLBACK_WHATSAPP_NUMBER = "10000000000";
const FALLBACK_IMAGE_PATH = "/logo.png";

const resolveFallbackImageUrl = () => {
  if (typeof window === "undefined") return "";
  return new URL(withBasePath(FALLBACK_IMAGE_PATH), `${window.location.origin}/`).toString();
};

const resolveFashionProductImageUrl = (product: FashionProduct) =>
  product.primaryImage?.trim() || product.detailImage?.trim() || product.stylingImage?.trim() || resolveFallbackImageUrl();
const resolveFashionProductDeepLink = (productId: string) => {
  const path = withBasePath(`/fashion/collections?focusProduct=${encodeURIComponent(productId)}`);
  if (typeof window === "undefined") return path;
  return new URL(path, `${window.location.origin}/`).toString();
};

export const getFashionWhatsAppNumber = () => {
  const digits = getFashionClientViewModel().whatsapp.phoneNumber.replace(/\D/g, "");
  return digits || FALLBACK_WHATSAPP_NUMBER;
};

const extractWhatsAppDigits = (value?: string) => value?.replace(/\D/g, "") ?? "";
const normalizeWhatsAppNumber = (value?: string, fallback?: string) =>
  extractWhatsAppDigits(value) || extractWhatsAppDigits(fallback) || FALLBACK_WHATSAPP_NUMBER;
const getProductWhatsAppNumber = (product: FashionProduct, fallbackPhoneNumber?: string) =>
  normalizeWhatsAppNumber(product.whatsappNumber?.trim(), fallbackPhoneNumber);

const openWhatsAppMessage = (message: string, phoneNumber = getFashionWhatsAppNumber()) => {
  window.open(`https://wa.me/${normalizeWhatsAppNumber(phoneNumber)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
};

const trySendViaWhatsAppApi = async (message: string, imageUrl?: string) => {
  try {
    const response = await apiJson<{ ok?: boolean; delivery?: string }>("/api/fashion/whatsapp/checkout", "POST", {
      message,
      imageUrl: imageUrl?.trim() || undefined
    });
    return Boolean(response.ok);
  } catch {
    return false;
  }
};

const getFreshFashionViewModel = async () => {
  const content = await getPublishedFashionContentAsync();
  return buildFashionClientViewModel(content);
};

const buildProductCheckoutMessage = (
  product: FashionProduct,
  whatsapp: ReturnType<typeof getFashionClientViewModel>["whatsapp"],
  source?: string
) => {
  const imageUrl = resolveFashionProductImageUrl(product);
  const message = [
    product.whatsappNote ?? `Hello, I want this fashion item: ${product.name}.`,
    `Collection: ${product.collection}.`,
    `Category: ${product.category}.`,
    `Price: ${formatFashionPrice(product.price)}.`,
    imageUrl ? `Image: ${imageUrl}.` : null,
    `Product link: ${resolveFashionProductDeepLink(product.id)}.`,
    `Tone: ${product.tone}.`,
    `Occasion: ${product.occasion}.`,
    `CTA: ${whatsapp.productCta}.`,
    source ? `Source: ${source}.` : null
  ]
    .filter(Boolean)
    .join(" ");

  return { imageUrl, message };
};

const buildFitCheckoutMessage = (
  product: FashionProduct,
  whatsapp: ReturnType<typeof getFashionClientViewModel>["whatsapp"],
  source?: string
) => {
  const imageUrl = resolveFashionProductImageUrl(product);
  const message = [
    `Hello, I need fit and sizing guidance for ${product.name}.`,
    `Collection: ${product.collection}.`,
    imageUrl ? `Image: ${imageUrl}.` : null,
    `Product link: ${resolveFashionProductDeepLink(product.id)}.`,
    `Fit: ${product.fit}.`,
    `Occasion: ${product.occasion}.`,
    `CTA: ${whatsapp.fitCta}.`,
    source ? `Source: ${source}.` : null
  ]
    .filter(Boolean)
    .join(" ");

  return { imageUrl, message };
};

export const openGeneralFashionWhatsApp = () => {
  const fashionViewModel = getFashionClientViewModel();
  openWhatsAppMessage(`Hello, I want help with your fashion selections. ${fashionViewModel.whatsapp.disclaimer}`);
};

export const getFashionProductWhatsAppUrl = (product: FashionProduct, source?: string) => {
  const fashionViewModel = getFashionClientViewModel();
  const { message } = buildProductCheckoutMessage(product, fashionViewModel.whatsapp, source);
  const phoneNumber = getProductWhatsAppNumber(product, fashionViewModel.whatsapp.phoneNumber || getFashionWhatsAppNumber());
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
};

export const openFashionProductCheckout = async (product: FashionProduct, source?: string) => {
  const fashionViewModel = await getFreshFashionViewModel();
  const { imageUrl, message } = buildProductCheckoutMessage(product, fashionViewModel.whatsapp, source);
  const overrideDigits = extractWhatsAppDigits(product.whatsappNumber?.trim());
  if (overrideDigits) {
    openWhatsAppMessage(message, overrideDigits);
    return;
  }
  const sent = await trySendViaWhatsAppApi(message, imageUrl);
  if (!sent) {
    openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
  }
};

export const getFashionProductFitWhatsAppUrl = (product: FashionProduct, source?: string) => {
  const fashionViewModel = getFashionClientViewModel();
  const { message } = buildFitCheckoutMessage(product, fashionViewModel.whatsapp, source);
  const phoneNumber = getProductWhatsAppNumber(product, fashionViewModel.whatsapp.phoneNumber || getFashionWhatsAppNumber());
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
};

export const openFashionFitCheckout = async (product: FashionProduct, source?: string) => {
  const fashionViewModel = await getFreshFashionViewModel();
  const { imageUrl, message } = buildFitCheckoutMessage(product, fashionViewModel.whatsapp, source);
  const overrideDigits = extractWhatsAppDigits(product.whatsappNumber?.trim());
  if (overrideDigits) {
    openWhatsAppMessage(message, overrideDigits);
    return;
  }
  const sent = await trySendViaWhatsAppApi(message, imageUrl);
  if (!sent) {
    openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
  }
};

export const openFashionLookWhatsApp = (title: string, items: FashionProduct[], source: string) => {
  void getFreshFashionViewModel().then((fashionViewModel) => {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const message = [
      `Hello, I want this look: ${title}.`,
      ...items.flatMap((item) => {
        const imageUrl = resolveFashionProductImageUrl(item);
        return [
          `${item.name} - ${formatFashionPrice(item.price)}.`,
          imageUrl ? `Image: ${imageUrl}.` : null,
          `Product link: ${resolveFashionProductDeepLink(item.id)}.`
        ].filter(Boolean);
      }),
      `Reference total: ${formatFashionPrice(total)}.`,
      `CTA: ${fashionViewModel.whatsapp.lookCta}.`,
      `Source: ${source}.`
    ].join(" ");
    const imageUrl = items[0] ? resolveFashionProductImageUrl(items[0]) : resolveFallbackImageUrl();
    void trySendViaWhatsAppApi(message, imageUrl).then((sent) => {
      if (!sent) openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
    });
  });
};

export const openFashionPairSelectionCheckout = (leadProduct: FashionProduct, pairedProducts: FashionProduct[], source: string) => {
  const items = [leadProduct, ...pairedProducts];
  void getFreshFashionViewModel().then((fashionViewModel) => {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const message = [
      `Hello, I want to order ${leadProduct.name} with these paired items.`,
      `Lead item: ${leadProduct.name} - ${formatFashionPrice(leadProduct.price)}.`,
      `Lead image: ${resolveFashionProductImageUrl(leadProduct)}.`,
      pairedProducts.length > 0 ? "Selected pairings:" : null,
      ...pairedProducts.flatMap((item) => {
        const imageUrl = resolveFashionProductImageUrl(item);
        return [
          `${item.name} - ${formatFashionPrice(item.price)}.`,
          imageUrl ? `Image: ${imageUrl}.` : null,
          `Product link: ${resolveFashionProductDeepLink(item.id)}.`
        ].filter(Boolean);
      }),
      `Reference total: ${formatFashionPrice(total)}.`,
      `CTA: ${fashionViewModel.whatsapp.lookCta}.`,
      `Source: ${source}.`
    ]
      .filter(Boolean)
      .join(" ");
    const imageUrl = resolveFashionProductImageUrl(leadProduct);
    void trySendViaWhatsAppApi(message, imageUrl).then((sent) => {
      if (!sent) openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
    });
  });
};

export const openFashionStoryWhatsApp = (title: string, items: FashionProduct[], source: string) => {
  void getFreshFashionViewModel().then((fashionViewModel) => {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const message = [
      `Hello, I want this story set: ${title}.`,
      ...items.flatMap((item) => {
        const imageUrl = resolveFashionProductImageUrl(item);
        return [
          `${item.name} - ${formatFashionPrice(item.price)}.`,
          imageUrl ? `Image: ${imageUrl}.` : null,
          `Product link: ${resolveFashionProductDeepLink(item.id)}.`
        ].filter(Boolean);
      }),
      `Reference total: ${formatFashionPrice(total)}.`,
      `CTA: ${fashionViewModel.whatsapp.storyCta}.`,
      `Source: ${source}.`
    ].join(" ");
    const imageUrl = items[0] ? resolveFashionProductImageUrl(items[0]) : resolveFallbackImageUrl();
    void trySendViaWhatsAppApi(message, imageUrl).then((sent) => {
      if (!sent) openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
    });
  });
};
