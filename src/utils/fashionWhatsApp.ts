import type { FashionProduct } from "../data/fashionCatalog";
import { apiJson } from "../api/client";
import { withBasePath } from "./basePath";
import { buildFashionClientViewModel, getFashionClientViewModel, getPublishedFashionContentAsync } from "./fashionDraft";
import { formatFashionPrice } from "./fashionPricing";

const FALLBACK_WHATSAPP_NUMBER = "10000000000";
const FALLBACK_IMAGE_PATH = "/logo.png";

type FashionWhatsAppSettings = ReturnType<typeof getFashionClientViewModel>["whatsapp"];

type TemplateValues = Record<string, string | undefined>;

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

const renderTemplate = (template: string, values: TemplateValues) =>
  template
    .replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, token: string) => values[token]?.trim() ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n +/g, "\n")
    .trim();

const withTemplateDefaults = (whatsapp: FashionWhatsAppSettings, values: TemplateValues): TemplateValues => ({
  disclaimer: whatsapp.disclaimer,
  ...values
});

const buildItemSummary = (items: FashionProduct[]) =>
  items
    .map((item) => {
      const deepLink = resolveFashionProductDeepLink(item.id);
      const imageUrl = resolveFashionProductImageUrl(item);
      return [
        `${item.name} - ${formatFashionPrice(item.price)}.`,
        `Product link: ${deepLink}.`,
        imageUrl ? `Image preview: ${imageUrl}.` : null
      ]
        .filter(Boolean)
        .join(" ");
    })
    .join("\n");

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

export const buildGeneralFashionWhatsAppMessage = (whatsapp: FashionWhatsAppSettings) =>
  renderTemplate(whatsapp.generalMessageTemplate, withTemplateDefaults(whatsapp, {}));

export const buildProductCheckoutMessage = (
  product: FashionProduct,
  whatsapp: FashionWhatsAppSettings,
  source?: string,
  customerNotes?: string
) => {
  const deepLink = resolveFashionProductDeepLink(product.id);
  const imageUrl = resolveFashionProductImageUrl(product);
  const message = renderTemplate(
    whatsapp.productMessageTemplate,
    withTemplateDefaults(whatsapp, {
      product_name: product.name,
      product_note: product.whatsappNote ?? `Hello, I want this fashion item: ${product.name}.`,
      reference_total: formatFashionPrice(product.price),
      price: formatFashionPrice(product.price),
      collection: product.collection,
      category: product.category,
      image_link: imageUrl,
      product_link: deepLink,
      tone: product.tone,
      occasion: product.occasion,
      fit: product.fit,
      cta: whatsapp.productCta,
      source,
      customer_notes: customerNotes
    })
  );
  return { imageUrl, message };
};

export const buildFitCheckoutMessage = (
  product: FashionProduct,
  whatsapp: FashionWhatsAppSettings,
  source?: string,
  customerNotes?: string
) => {
  const deepLink = resolveFashionProductDeepLink(product.id);
  const imageUrl = resolveFashionProductImageUrl(product);
  const message = renderTemplate(
    whatsapp.fitMessageTemplate,
    withTemplateDefaults(whatsapp, {
      product_name: product.name,
      reference_total: formatFashionPrice(product.price),
      price: formatFashionPrice(product.price),
      collection: product.collection,
      fit: product.fit,
      occasion: product.occasion,
      image_link: imageUrl,
      product_link: deepLink,
      cta: whatsapp.fitCta,
      source,
      customer_notes: customerNotes
    })
  );
  return { imageUrl, message };
};

export const buildLookWhatsAppMessage = (
  title: string,
  items: FashionProduct[],
  whatsapp: FashionWhatsAppSettings,
  source: string,
  customerNotes?: string
) => {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return renderTemplate(
    whatsapp.lookMessageTemplate,
    withTemplateDefaults(whatsapp, {
      title,
      total_price: formatFashionPrice(total),
      items_summary: buildItemSummary(items),
      cta: whatsapp.lookCta,
      source,
      customer_notes: customerNotes
    })
  );
};

export const buildPairWhatsAppMessage = (
  leadProduct: FashionProduct,
  pairedProducts: FashionProduct[],
  whatsapp: FashionWhatsAppSettings,
  source: string,
  customerNotes?: string
) => {
  const items = [leadProduct, ...pairedProducts];
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return renderTemplate(
    whatsapp.pairMessageTemplate,
    withTemplateDefaults(whatsapp, {
      lead_product: `${leadProduct.name} - ${formatFashionPrice(leadProduct.price)}.`,
      lead_image_link: resolveFashionProductImageUrl(leadProduct),
      total_price: formatFashionPrice(total),
      items_summary: buildItemSummary(pairedProducts),
      cta: whatsapp.lookCta,
      source,
      customer_notes: customerNotes
    })
  );
};

export const buildStoryWhatsAppMessage = (
  title: string,
  items: FashionProduct[],
  whatsapp: FashionWhatsAppSettings,
  source: string,
  customerNotes?: string
) => {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return renderTemplate(
    whatsapp.storyMessageTemplate,
    withTemplateDefaults(whatsapp, {
      title,
      total_price: formatFashionPrice(total),
      items_summary: buildItemSummary(items),
      cta: whatsapp.storyCta,
      source,
      customer_notes: customerNotes
    })
  );
};

export const buildWhatsAppPreviewMessages = (whatsapp: FashionWhatsAppSettings) => {
  const previewProduct: FashionProduct = {
    id: "preview-product",
    name: "Contour Wool Coat",
    collection: "Signature Outerwear",
    category: "Outerwear",
    price: 148,
    tone: "Charcoal",
    note: "Preview product",
    palette: "charcoal",
    material: "Wool blend",
    fit: "Long tailored fit",
    occasion: "Work, evening layering",
    availabilityLabel: "Ready to order",
    styleTags: ["tailored"],
    whatsappNote: "Customer is interested in the Contour Wool Coat."
  };
  const previewItems: FashionProduct[] = [
    previewProduct,
    {
      ...previewProduct,
      id: "preview-item-2",
      name: "Minimal Leather Tote",
      category: "Bags",
      price: 74
    }
  ];
  return {
    general: buildGeneralFashionWhatsAppMessage(whatsapp),
    product: buildProductCheckoutMessage(previewProduct, whatsapp, "Fashion admin preview", "Please confirm availability").message,
    fit: buildFitCheckoutMessage(previewProduct, whatsapp, "Fashion admin preview", "I need exact fit guidance").message,
    look: buildLookWhatsAppMessage("Office Contrast", previewItems, whatsapp, "Fashion admin preview", "I want the full look"),
    pair: buildPairWhatsAppMessage(previewProduct, previewItems.slice(1), whatsapp, "Fashion admin preview", "Please reserve these pairings"),
    story: buildStoryWhatsAppMessage("Monochrome Campaign Story", previewItems, whatsapp, "Fashion admin preview", "Send full story pricing")
  };
};

export const openGeneralFashionWhatsApp = () => {
  const fashionViewModel = getFashionClientViewModel();
  openWhatsAppMessage(buildGeneralFashionWhatsAppMessage(fashionViewModel.whatsapp));
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
  if (!sent) openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
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
  if (!sent) openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
};

export const openFashionLookWhatsApp = (title: string, items: FashionProduct[], source: string) => {
  void getFreshFashionViewModel().then((fashionViewModel) => {
    const message = buildLookWhatsAppMessage(title, items, fashionViewModel.whatsapp, source);
    const imageUrl = items[0] ? resolveFashionProductImageUrl(items[0]) : resolveFallbackImageUrl();
    void trySendViaWhatsAppApi(message, imageUrl).then((sent) => {
      if (!sent) openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
    });
  });
};

export const openFashionPairSelectionCheckout = (leadProduct: FashionProduct, pairedProducts: FashionProduct[], source: string) => {
  void getFreshFashionViewModel().then((fashionViewModel) => {
    const message = buildPairWhatsAppMessage(leadProduct, pairedProducts, fashionViewModel.whatsapp, source);
    const imageUrl = resolveFashionProductImageUrl(leadProduct);
    void trySendViaWhatsAppApi(message, imageUrl).then((sent) => {
      if (!sent) openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
    });
  });
};

export const openFashionStoryWhatsApp = (title: string, items: FashionProduct[], source: string) => {
  void getFreshFashionViewModel().then((fashionViewModel) => {
    const message = buildStoryWhatsAppMessage(title, items, fashionViewModel.whatsapp, source);
    const imageUrl = items[0] ? resolveFashionProductImageUrl(items[0]) : resolveFallbackImageUrl();
    void trySendViaWhatsAppApi(message, imageUrl).then((sent) => {
      if (!sent) openWhatsAppMessage(message, fashionViewModel.whatsapp.phoneNumber);
    });
  });
};
