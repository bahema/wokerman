import type { Product, SiteContent } from "../../../shared/siteTypes";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const asNonEmptyString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : "");

const isHttpUrl = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isProductCategory = (value: unknown): value is Product["category"] =>
  value === "Forex" || value === "Betting" || value === "Software" || value === "Social";

const validateProduct = (product: unknown, groupName: string, index: number) => {
  if (!isObject(product)) return `${groupName} product #${index + 1}: invalid product object.`;
  if (!asNonEmptyString(product.id)) return `${groupName} product #${index + 1}: id is required.`;
  if (!asNonEmptyString(product.title)) return `${groupName} product #${index + 1}: title is required.`;
  if (!asNonEmptyString(product.shortDescription)) return `${groupName} product #${index + 1}: shortDescription is required.`;
  if (!asNonEmptyString(product.longDescription)) return `${groupName} product #${index + 1}: longDescription is required.`;
  if (product.position !== undefined && product.position !== null) {
    if (typeof product.position !== "number" || !Number.isFinite(product.position) || product.position < 1) {
      return `${groupName} product #${index + 1}: position must be a number >= 1 when provided.`;
    }
  }
  if (!Array.isArray(product.features)) return `${groupName} product #${index + 1}: features must be an array.`;
  if (!product.features.some((feature) => asNonEmptyString(feature))) {
    return `${groupName} product #${index + 1}: at least one feature is required.`;
  }
  if (typeof product.rating !== "number" || !Number.isFinite(product.rating) || product.rating < 1 || product.rating > 5) {
    return `${groupName} product #${index + 1}: rating must be between 1 and 5.`;
  }
  if (typeof product.isNew !== "boolean") return `${groupName} product #${index + 1}: isNew must be boolean.`;
  if (!isProductCategory(product.category)) return `${groupName} product #${index + 1}: category is invalid.`;
  if (!isHttpUrl(product.checkoutLink)) return `${groupName} product #${index + 1}: checkoutLink must be a valid http(s) URL.`;
  if (product.imageUrl !== undefined && product.imageUrl !== null && typeof product.imageUrl !== "string") {
    return `${groupName} product #${index + 1}: imageUrl must be a string when provided.`;
  }
  return "";
};

export const validateSiteContent = (value: unknown): { ok: true; content: SiteContent } | { ok: false; error: string } => {
  if (!isObject(value)) return { ok: false, error: "Invalid site content payload." };

  const branding = value.branding;
  const socials = value.socials;
  const hero = value.hero;
  const testimonials = value.testimonials;
  const products = value.products;
  const industries = value.industries;
  const footer = value.footer;

  if (!isObject(branding)) return { ok: false, error: "branding is required." };
  if (!asNonEmptyString(branding.logoText)) return { ok: false, error: "branding.logoText is required." };
  if (branding.accentColor !== undefined && branding.accentColor !== null && typeof branding.accentColor !== "string") {
    return { ok: false, error: "branding.accentColor must be a string when provided." };
  }
  if (
    branding.defaultTheme !== undefined &&
    branding.defaultTheme !== null &&
    branding.defaultTheme !== "system" &&
    branding.defaultTheme !== "light" &&
    branding.defaultTheme !== "dark"
  ) {
    return { ok: false, error: "branding.defaultTheme must be one of system/light/dark." };
  }

  if (!isObject(socials)) return { ok: false, error: "socials is required." };
  if (!isHttpUrl(socials.facebookUrl)) return { ok: false, error: "socials.facebookUrl must be a valid http(s) URL." };
  if (!isHttpUrl(socials.whatsappUrl)) return { ok: false, error: "socials.whatsappUrl must be a valid http(s) URL." };
  if (socials.other !== undefined) {
    if (!Array.isArray(socials.other)) return { ok: false, error: "socials.other must be an array when provided." };
    for (let i = 0; i < socials.other.length; i += 1) {
      const item = socials.other[i];
      if (!isObject(item)) return { ok: false, error: `socials.other #${i + 1}: invalid object.` };
      if (!asNonEmptyString(item.name)) return { ok: false, error: `socials.other #${i + 1}: name is required.` };
      if (!isHttpUrl(item.url)) return { ok: false, error: `socials.other #${i + 1}: url must be a valid http(s) URL.` };
    }
  }

  if (!isObject(hero)) return { ok: false, error: "hero is required." };
  if (!asNonEmptyString(hero.headline)) return { ok: false, error: "hero.headline is required." };
  if (!asNonEmptyString(hero.subtext)) return { ok: false, error: "hero.subtext is required." };
  if (!isObject(hero.ctaPrimary) || !asNonEmptyString(hero.ctaPrimary.label) || !asNonEmptyString(hero.ctaPrimary.target)) {
    return { ok: false, error: "hero.ctaPrimary requires label and target." };
  }
  if (!isObject(hero.ctaSecondary) || !asNonEmptyString(hero.ctaSecondary.label) || !asNonEmptyString(hero.ctaSecondary.target)) {
    return { ok: false, error: "hero.ctaSecondary requires label and target." };
  }
  if (!Array.isArray(hero.stats)) return { ok: false, error: "hero.stats must be an array." };
  for (let i = 0; i < hero.stats.length; i += 1) {
    const stat = hero.stats[i];
    if (!isObject(stat) || !asNonEmptyString(stat.label) || !asNonEmptyString(stat.value)) {
      return { ok: false, error: `hero.stats #${i + 1}: label and value are required.` };
    }
  }

  if (!Array.isArray(testimonials)) return { ok: false, error: "testimonials must be an array." };
  for (let i = 0; i < testimonials.length; i += 1) {
    const item = testimonials[i];
    if (!isObject(item)) return { ok: false, error: `testimonials #${i + 1}: invalid object.` };
    if (!asNonEmptyString(item.id)) return { ok: false, error: `testimonials #${i + 1}: id is required.` };
    if (!asNonEmptyString(item.name)) return { ok: false, error: `testimonials #${i + 1}: name is required.` };
    if (!asNonEmptyString(item.role)) return { ok: false, error: `testimonials #${i + 1}: role is required.` };
    if (!asNonEmptyString(item.quote)) return { ok: false, error: `testimonials #${i + 1}: quote is required.` };
    if (typeof item.rating !== "number" || !Number.isFinite(item.rating) || item.rating < 1 || item.rating > 5) {
      return { ok: false, error: `testimonials #${i + 1}: rating must be between 1 and 5.` };
    }
    if (item.avatarUrl !== undefined && item.avatarUrl !== null && typeof item.avatarUrl !== "string") {
      return { ok: false, error: `testimonials #${i + 1}: avatarUrl must be a string when provided.` };
    }
  }

  if (!isObject(products)) return { ok: false, error: "products is required." };
  const groups: Array<{ key: keyof SiteContent["products"]; label: string }> = [
    { key: "forex", label: "Forex" },
    { key: "betting", label: "Betting" },
    { key: "software", label: "Software" },
    { key: "social", label: "Social" }
  ];
  for (const group of groups) {
    const entries = products[group.key];
    if (!Array.isArray(entries)) return { ok: false, error: `products.${group.key} must be an array.` };
    for (let i = 0; i < entries.length; i += 1) {
      const productError = validateProduct(entries[i], group.label, i);
      if (productError) return { ok: false, error: productError };
    }
  }

  if (!Array.isArray(industries)) return { ok: false, error: "industries must be an array." };
  for (let i = 0; i < industries.length; i += 1) {
    const item = industries[i];
    if (!isObject(item)) return { ok: false, error: `industries #${i + 1}: invalid object.` };
    if (!asNonEmptyString(item.id)) return { ok: false, error: `industries #${i + 1}: id is required.` };
    if (!asNonEmptyString(item.label)) return { ok: false, error: `industries #${i + 1}: label is required.` };
    const icon = asNonEmptyString(item.icon);
    const imageUrl = asNonEmptyString(item.imageUrl);
    if (!icon && !imageUrl) return { ok: false, error: `industries #${i + 1}: provide icon or imageUrl.` };
    if (item.link !== undefined && item.link !== null && !isHttpUrl(item.link)) {
      return { ok: false, error: `industries #${i + 1}: link must be a valid http(s) URL when provided.` };
    }
  }

  if (!isObject(footer)) return { ok: false, error: "footer is required." };
  if (!asNonEmptyString(footer.note)) return { ok: false, error: "footer.note is required." };
  if (!asNonEmptyString(footer.copyright)) return { ok: false, error: "footer.copyright is required." };

  return { ok: true, content: value as SiteContent };
};
