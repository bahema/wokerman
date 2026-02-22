import type { SiteContent } from "../data/siteData";

const isValidUrl = (input: string) => {
  try {
    const parsed = new URL(input.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const validateContentForSave = (content: SiteContent) => {
  if (content.homeUi) {
    const requiredHomeUiKeys: Array<
      | "heroEyebrow"
      | "heroQuickGrabsLabel"
      | "performanceSnapshotTitle"
      | "performanceSnapshotSubtext"
      | "industriesHeading"
      | "industriesEmptyMessage"
      | "productCardNewBadgeLabel"
      | "productCardNewReleaseLabel"
      | "productCardKeyFeaturesSuffix"
      | "productCardCheckoutLabel"
      | "productCardMoreInfoLabel"
      | "productCardAffiliateDisclosure"
    > = [
      "heroEyebrow",
      "heroQuickGrabsLabel",
      "performanceSnapshotTitle",
      "performanceSnapshotSubtext",
      "industriesHeading",
      "industriesEmptyMessage",
      "productCardNewBadgeLabel",
      "productCardNewReleaseLabel",
      "productCardKeyFeaturesSuffix",
      "productCardCheckoutLabel",
      "productCardMoreInfoLabel",
      "productCardAffiliateDisclosure"
    ];
    for (const key of requiredHomeUiKeys) {
      if (!content.homeUi[key]?.trim()) return `Home UI validation failed: ${key} is required.`;
    }

    const adSections = content.homeUi.adsectionMan;
    const adEntries = [
      { label: "gadgets", fields: adSections.gadgets },
      { label: "ai", fields: adSections.ai }
    ];
    for (const entry of adEntries) {
      for (const [field, value] of Object.entries(entry.fields)) {
        if (field === "priceBadge") continue;
        if (typeof value === "string" && !value.trim()) {
          return `Home UI validation failed: adsection ${entry.label}.${field} is required.`;
        }
        if (field === "price" && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
          return `Home UI validation failed: adsection ${entry.label}.price must be greater than 0.`;
        }
      }
    }
  }

  if (content.productSections) {
    const sections = content.productSections;
    const keys: Array<keyof typeof sections> = ["forex", "betting", "software", "social"];
    for (const key of keys) {
      if (!sections[key]?.title?.trim()) return `${key} section: Title is required.`;
      if (!sections[key]?.description?.trim()) return `${key} section: Description is required.`;
    }
  }

  if (content.healthPage) {
    if (!content.healthPage.hero2.eyebrow.trim()) return "Health Hero 2: Eyebrow is required.";
    if (!content.healthPage.hero2.headline.trim()) return "Health Hero 2: Headline is required.";
    if (!content.healthPage.hero2.subtext.trim()) return "Health Hero 2: Subtext is required.";
    if (!content.healthPage.hero2.ctaPrimary.label.trim()) return "Health Hero 2: Primary CTA label is required.";
    if (!content.healthPage.hero2.ctaPrimary.target.trim()) return "Health Hero 2: Primary CTA target is required.";
    if (!content.healthPage.hero2.ctaSecondary.label.trim()) return "Health Hero 2: Secondary CTA label is required.";
    if (!content.healthPage.hero2.ctaSecondary.target.trim()) return "Health Hero 2: Secondary CTA target is required.";
    if (!content.healthPage.sections.gadgets.title.trim()) return "Health gadgets section: Title is required.";
    if (!content.healthPage.sections.gadgets.description.trim()) return "Health gadgets section: Description is required.";
    if (!content.healthPage.sections.supplements.title.trim()) return "Health supplements section: Title is required.";
    if (!content.healthPage.sections.supplements.description.trim()) return "Health supplements section: Description is required.";
  }

  if (!content.socials.facebookUrl.trim() || !isValidUrl(content.socials.facebookUrl)) {
    return "Social links validation failed: Facebook URL must be a valid http(s) URL.";
  }
  if (!content.socials.whatsappUrl.trim() || !isValidUrl(content.socials.whatsappUrl)) {
    return "Social links validation failed: WhatsApp URL must be a valid http(s) URL.";
  }
  for (let i = 0; i < (content.socials.other ?? []).length; i += 1) {
    const item = (content.socials.other ?? [])[i];
    if (!item.name.trim()) return `Social links validation failed: Other social #${i + 1} is missing a name.`;
    if (!item.url.trim() || !isValidUrl(item.url)) {
      return `Social links validation failed: Other social #${i + 1} has an invalid URL.`;
    }
  }

  const productGroups: Array<{ key: string; items: typeof content.products.forex }> = [
    { key: "Forex", items: content.products.forex },
    { key: "Betting", items: content.products.betting },
    { key: "Software", items: content.products.software },
    { key: "Social", items: content.products.social },
    { key: "Health gadgets", items: content.healthPage?.products.gadgets ?? [] },
    { key: "Health supplements", items: content.healthPage?.products.supplements ?? [] }
  ];

  for (const group of productGroups) {
    for (let i = 0; i < group.items.length; i += 1) {
      const item = group.items[i];
      if (!item.title.trim()) return `${group.key} product #${i + 1}: Title is required.`;
      if (!item.shortDescription.trim()) return `${group.key} product #${i + 1}: Short description is required.`;
      if (!item.longDescription.trim()) return `${group.key} product #${i + 1}: Long description is required.`;
      if (item.position !== undefined) {
        const normalized = Number(item.position);
        if (!Number.isFinite(normalized) || normalized < 1) return `${group.key} product #${i + 1}: Position must be >= 1.`;
      }
      if (!Number.isFinite(item.rating) || item.rating < 1 || item.rating > 5) return `${group.key} product #${i + 1}: Rating must be between 1 and 5.`;
      if (!isValidUrl(item.checkoutLink)) return `${group.key} product #${i + 1}: Checkout URL is invalid.`;
      if (!item.features.map((feature) => feature.trim()).filter(Boolean).length) {
        return `${group.key} product #${i + 1}: At least one feature is required.`;
      }
    }
  }

  for (let i = 0; i < content.testimonials.length; i += 1) {
    const item = content.testimonials[i];
    if (!item.name.trim()) return `Testimonial #${i + 1}: Name is required.`;
    if (!item.role.trim()) return `Testimonial #${i + 1}: Role is required.`;
    if (!item.quote.trim()) return `Testimonial #${i + 1}: Quote is required.`;
    if (!Number.isFinite(item.rating) || item.rating < 1 || item.rating > 5) return `Testimonial #${i + 1}: Rating must be between 1 and 5.`;
  }

  for (let i = 0; i < content.industries.length; i += 1) {
    const item = content.industries[i];
    if (!item.label.trim()) return `Industry #${i + 1}: Label is required.`;
    if (!item.icon?.trim() && !item.imageUrl?.trim()) return `Industry #${i + 1}: Provide either an icon or image URL.`;
  }

  return "";
};
