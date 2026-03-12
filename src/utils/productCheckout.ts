import type { Product, SiteContent } from "../data/siteData";
import { getFashionWhatsAppNumber } from "./fashionWhatsApp";

const extractDigits = (value?: string) => value?.replace(/\D+/g, "") ?? "";

const getSiteWhatsAppDigits = (content?: SiteContent) => {
  const raw = content?.socials?.whatsappUrl?.trim() ?? "";
  if (!raw) return "";
  const directDigits = extractDigits(raw);
  if (directDigits) return directDigits;
  try {
    const parsed = new URL(raw);
    return extractDigits(parsed.pathname + parsed.search);
  } catch {
    return "";
  }
};

const buildWhatsAppUrl = (phoneNumber: string, product: Product) => {
  const message = `Hello, I want to proceed with ${product.title}.`;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
};

export const resolveProductCheckoutTarget = (product: Product, content?: SiteContent) => {
  const checkoutLink = product.checkoutLink.trim();
  if (/^https?:\/\//i.test(checkoutLink)) {
    return { kind: "url" as const, target: checkoutLink };
  }
  const phoneNumber =
    extractDigits(product.whatsappNumber?.trim()) ||
    extractDigits(getFashionWhatsAppNumber()) ||
    getSiteWhatsAppDigits(content);
  if (phoneNumber) {
    return { kind: "whatsapp" as const, target: buildWhatsAppUrl(phoneNumber, product) };
  }
  return { kind: "none" as const, target: "" };
};

export const openProductCheckout = (product: Product, content?: SiteContent) => {
  const resolved = resolveProductCheckoutTarget(product, content);
  if (!resolved.target) return false;
  window.open(resolved.target, "_blank", "noopener,noreferrer");
  return true;
};
