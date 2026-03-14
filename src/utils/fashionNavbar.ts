const PLACEHOLDER_WHATSAPP_NUMBER = "10000000000";
const SITE_PUBLISHED_CACHE_KEY = "site:published:cache";

const extractDigits = (value?: string) => value?.replace(/\D+/g, "") ?? "";

const readSiteWhatsAppDigits = () => {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(SITE_PUBLISHED_CACHE_KEY);
    if (!raw) return "";
    const content = JSON.parse(raw) as { socials?: { whatsappUrl?: string } };
    const url = content.socials?.whatsappUrl?.trim() ?? "";
    if (!url) return "";
    const direct = extractDigits(url);
    if (direct) return direct;
    try {
      const parsed = new URL(url);
      return extractDigits(`${parsed.pathname}${parsed.search}`);
    } catch {
      return "";
    }
  } catch {
    return "";
  }
};

const resolveWhatsAppDigits = (phoneNumber?: string) => {
  const digits = extractDigits(phoneNumber);
  if (digits && digits !== PLACEHOLDER_WHATSAPP_NUMBER) return digits;
  const siteDigits = readSiteWhatsAppDigits();
  if (siteDigits && siteDigits !== PLACEHOLDER_WHATSAPP_NUMBER) return siteDigits;
  return "";
};

export const buildFashionNavbarSocials = (phoneNumber?: string) => {
  const digits = resolveWhatsAppDigits(phoneNumber);
  return {
    facebookUrl: "https://facebook.com",
    whatsappUrl: digits ? `https://wa.me/${digits}` : "https://wa.me/"
  };
};
