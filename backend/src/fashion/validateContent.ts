import type { FashionContent, FashionHomepageBlockId, FashionProduct, FashionStyleSetKey } from "../../../shared/fashionTypes";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const asNonEmptyString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : "");

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean) : null;

const HOMEPAGE_BLOCK_IDS: FashionHomepageBlockId[] = [
  "featured-stories",
  "storefront-hero",
  "featured-drops",
  "trending-now",
  "complete-the-look",
  "accessories",
  "most-asked",
  "best-seller",
  "editors-picks",
  "elevated-edit",
  "shop-the-drop",
  "why-shop-here",
  "footer"
];

const STYLE_SET_KEYS: FashionStyleSetKey[] = ["office", "weekend", "evening", "travel"];

const COLLECTION_SORTS = new Set(["featured", "newest", "price-low", "price-high"]);
const SPOTLIGHT_MODES = new Set(["auto", "manual"]);
const FILTER_KINDS = new Set(["system", "category", "custom"]);
const BADGE_TYPES = new Set(["new", "used", "best-seller", "limited", "trending", "editor-pick", "hot"]);
const CURRENCIES = new Set(["USD", "EUR", "GBP", "RWF"]);
const HERO_CTA_ROUTES = new Set(["/fashion", "/fashion/collections", "/fashion/editorial", "/fashion/style-notes"]);

const validateProduct = (product: unknown, index: number) => {
  if (!isObject(product)) return `productCatalog #${index + 1}: invalid product object.`;
  if (!asNonEmptyString(product.id)) return `productCatalog #${index + 1}: id is required.`;
  if (!asNonEmptyString(product.name)) return `productCatalog #${index + 1}: name is required.`;
  if (!asNonEmptyString(product.collection)) return `productCatalog #${index + 1}: collection is required.`;
  if (!asNonEmptyString(product.category)) return `productCatalog #${index + 1}: category is required.`;
  if (typeof product.price !== "number" || !Number.isFinite(product.price) || product.price < 0) {
    return `productCatalog #${index + 1}: price must be a number >= 0.`;
  }
  if (product.badge !== undefined && product.badge !== null && typeof product.badge !== "string") {
    return `productCatalog #${index + 1}: badge must be a string when provided.`;
  }
  if (product.badgeType !== undefined && product.badgeType !== null && !BADGE_TYPES.has(String(product.badgeType))) {
    return `productCatalog #${index + 1}: badgeType is invalid.`;
  }
  if (!asNonEmptyString(product.tone)) return `productCatalog #${index + 1}: tone is required.`;
  if (!asNonEmptyString(product.note)) return `productCatalog #${index + 1}: note is required.`;
  if (!asNonEmptyString(product.palette)) return `productCatalog #${index + 1}: palette is required.`;
  if (!asNonEmptyString(product.material)) return `productCatalog #${index + 1}: material is required.`;
  if (!asNonEmptyString(product.fit)) return `productCatalog #${index + 1}: fit is required.`;
  if (!asNonEmptyString(product.occasion)) return `productCatalog #${index + 1}: occasion is required.`;
  if (!asNonEmptyString(product.availabilityLabel)) return `productCatalog #${index + 1}: availabilityLabel is required.`;
  const styleTags = asStringArray(product.styleTags);
  if (!styleTags || styleTags.length === 0) return `productCatalog #${index + 1}: styleTags must contain at least one item.`;
  if (product.ctaLabel !== undefined && product.ctaLabel !== null && typeof product.ctaLabel !== "string") {
    return `productCatalog #${index + 1}: ctaLabel must be a string when provided.`;
  }
  if (product.whatsappNote !== undefined && product.whatsappNote !== null && typeof product.whatsappNote !== "string") {
    return `productCatalog #${index + 1}: whatsappNote must be a string when provided.`;
  }
  if (product.whatsappNumber !== undefined && product.whatsappNumber !== null && typeof product.whatsappNumber !== "string") {
    return `productCatalog #${index + 1}: whatsappNumber must be a string when provided.`;
  }
  if (product.bundleIds !== undefined) {
    const bundleIds = asStringArray(product.bundleIds);
    if (!bundleIds) return `productCatalog #${index + 1}: bundleIds must be an array when provided.`;
  }
  for (const field of ["primaryImage", "detailImage", "stylingImage"] as const) {
    if (product[field] !== undefined && product[field] !== null && typeof product[field] !== "string") {
      return `productCatalog #${index + 1}: ${field} must be a string when provided.`;
    }
  }
  return "";
};

const validateHeroSlide = (slide: unknown, field: "homepageSlides" | "editorialSlides", index: number) => {
  if (!isObject(slide)) return `${field} #${index + 1}: invalid slide object.`;
  for (const key of ["id", "eyebrow", "headline", "subtext", "primaryCta", "secondaryCta", "palette", "accent"] as const) {
    if (!asNonEmptyString(slide[key])) return `${field} #${index + 1}: ${key} is required.`;
  }
  if (slide.badge !== undefined && slide.badge !== null && typeof slide.badge !== "string") {
    return `${field} #${index + 1}: badge must be a string when provided.`;
  }
  if (slide.imageUrl !== undefined && slide.imageUrl !== null && typeof slide.imageUrl !== "string") {
    return `${field} #${index + 1}: imageUrl must be a string when provided.`;
  }
  for (const routeKey of ["primaryCtaHref", "secondaryCtaHref"] as const) {
    if (slide[routeKey] !== undefined && slide[routeKey] !== null) {
      if (typeof slide[routeKey] !== "string") {
        return `${field} #${index + 1}: ${routeKey} must be a string when provided.`;
      }
      const value = String(slide[routeKey]).trim();
      if (value && !HERO_CTA_ROUTES.has(value)) {
        return `${field} #${index + 1}: ${routeKey} must be one of ${Array.from(HERO_CTA_ROUTES).join(", ")}.`;
      }
    }
  }
  return "";
};

const validateReferenceList = (value: unknown, productIds: Set<string>, field: string) => {
  const ids = asStringArray(value);
  if (!ids) return `${field} must be an array.`;
  for (let i = 0; i < ids.length; i += 1) {
    if (!productIds.has(ids[i])) return `${field} contains unknown product id "${ids[i]}".`;
  }
  return "";
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const validateFashionContent = (
  value: unknown
): { ok: true; content: FashionContent } | { ok: false; error: string } => {
  if (!isObject(value)) return { ok: false, error: "Invalid fashion content payload." };

  const homepage = value.homepage;
  const collections = value.collections;
  const editorial = value.editorial;
  const styleNotes = value.styleNotes;
  const pricing = value.pricing;
  const collectionFilters = value.collectionFilters;
  const styleSetAssignments = value.styleSetAssignments;
  const bundleAssignments = value.bundleAssignments;
  const bundleMeta = value.bundleMeta;
  const whatsapp = value.whatsapp;
  const productCatalog = value.productCatalog;
  const homepageSlides = value.homepageSlides;
  const editorialSlides = value.editorialSlides;
  const homepageAssignments = value.homepageAssignments;

  if (!isObject(homepage)) return { ok: false, error: "homepage is required." };
  for (const key of [
    "storiesEyebrow",
    "storiesTitle",
    "heroEyebrow",
    "heroHeadline",
    "heroSubtext",
    "featuredDropsEyebrow",
    "completeLookEyebrow",
    "completeLookTitle",
    "completeLookCtaLabel",
    "completeLookValueEyebrow",
    "completeLookValueNote",
    "accessoriesEyebrow",
    "accessoriesTitle",
    "accessoriesCtaLabel",
    "elevatedEditEyebrow",
    "elevatedEditTitle",
    "mostAskedEyebrow",
    "mostAskedTitle",
    "mostAskedCtaLabel",
    "bestSellerEyebrow",
    "bestSellerTitle",
    "bestSellerCtaLabel",
    "editorsPicksEyebrow",
    "editorsPicksTitle",
    "editorsPicksCtaLabel",
    "shopTheDropEyebrow",
    "shopTheDropTitle",
    "shopTheDropCtaLabel",
    "trustEyebrow",
    "trustTitle",
    "trustDescription",
    "footerEyebrow",
    "footerIntroNote",
    "footerSupportEyebrow",
    "footerSupportTitle",
    "footerLinksEyebrow",
    "footerContactEyebrow",
    "footerContactNote",
    "footerStatusNote",
    "footerLinkHomeLabel",
    "footerLinkEditorialLabel",
    "footerLinkCollectionsLabel",
    "footerLinkStyleNotesLabel",
    "modalWhyLabel",
    "modalCommerceNotice",
    "modalQuickPairEyebrow",
    "modalQuickPairNote",
    "modalFitCtaLabel",
    "modalContinueLabel",
    "modalPairTitle",
    "modalPairNote",
    "modalFeaturedRelatedLabel",
    "modalEmptyRelatedNote"
  ] as const) {
    if (!asNonEmptyString(homepage[key])) return { ok: false, error: `homepage.${key} is required.` };
  }
  for (const key of ["showTrending", "showAccessories", "showMostAsked", "showBestSeller", "showEditorsPicks"] as const) {
    if (typeof homepage[key] !== "boolean") return { ok: false, error: `homepage.${key} must be boolean.` };
  }

  if (!isObject(collections)) return { ok: false, error: "collections is required." };
  for (const key of ["pageTitle", "pageIntro", "loadMoreLabel", "collectionInquiryLabel"] as const) {
    if (!asNonEmptyString(collections[key])) return { ok: false, error: `collections.${key} is required.` };
  }
  if (!COLLECTION_SORTS.has(String(collections.defaultSort))) {
    return { ok: false, error: "collections.defaultSort is invalid." };
  }
  if (typeof collections.initialVisibleCount !== "number" || !Number.isFinite(collections.initialVisibleCount) || collections.initialVisibleCount < 1) {
    return { ok: false, error: "collections.initialVisibleCount must be a number >= 1." };
  }
  if (typeof collections.loadMoreCount !== "number" || !Number.isFinite(collections.loadMoreCount) || collections.loadMoreCount < 1) {
    return { ok: false, error: "collections.loadMoreCount must be a number >= 1." };
  }
  if (!SPOTLIGHT_MODES.has(String(collections.spotlightMode))) {
    return { ok: false, error: "collections.spotlightMode is invalid." };
  }

  if (!isObject(editorial)) return { ok: false, error: "editorial is required." };
  for (const key of [
    "introEyebrow",
    "pageTitle",
    "sliderTitle",
    "introHeadline",
    "introNote",
    "campaignNotesTitle",
    "campaignNotesNoteOne",
    "campaignNotesNoteTwo",
    "chapterTwoTitle",
    "chapterThreeTitle",
    "chapterTwoFeatureTitle",
    "chapterTwoFeatureNote",
    "chapterStoryTitle",
    "chapterStoryDescription",
    "chapterStoryFocusLabel",
    "chapterStoryGoalLabel",
    "chapterStoryActionLabel",
    "relatedStripTitle",
    "relatedStripSubtitle",
    "finalChapterFeatureTitle",
    "finalChapterFeatureNote",
    "finalChapterTitle",
    "finalChapterDescription",
    "shopStoryEyebrow",
    "shopStoryTitle",
    "storyCtaLabel",
    "chapterCtaLabel",
    "storyTitle",
    "storyNote"
  ] as const) {
    if (!asNonEmptyString(editorial[key])) return { ok: false, error: `editorial.${key} is required.` };
  }
  for (const key of [
    "introPrimaryImage",
    "introSecondaryImage",
    "introTertiaryImage",
    "campaignNotesImage",
    "chapterTwoPrimaryImage",
    "chapterTwoSecondaryImage",
    "chapterTwoTertiaryImage",
    "finalChapterPrimaryImage",
    "finalChapterSecondaryImage",
    "finalChapterTertiaryImage"
  ] as const) {
    if (editorial[key] !== undefined && editorial[key] !== null && typeof editorial[key] !== "string") {
      return { ok: false, error: `editorial.${key} must be a string when provided.` };
    }
  }

  if (!isObject(styleNotes)) return { ok: false, error: "styleNotes is required." };
  if (!STYLE_SET_KEYS.includes(styleNotes.defaultSet as FashionStyleSetKey)) {
    return { ok: false, error: "styleNotes.defaultSet is invalid." };
  }
  for (const key of ["pageTitle", "lookCtaLabel", "fitCtaLabel", "helperTitle", "panelIntro", "pairingEyebrow"] as const) {
    if (!asNonEmptyString(styleNotes[key])) return { ok: false, error: `styleNotes.${key} is required.` };
  }
  const introNotes = asStringArray(styleNotes.introNotes);
  if (!introNotes || introNotes.length === 0) return { ok: false, error: "styleNotes.introNotes must contain at least one item." };
  if (!isObject(styleNotes.setMeta)) return { ok: false, error: "styleNotes.setMeta is required." };
  for (const key of STYLE_SET_KEYS) {
    const item = styleNotes.setMeta[key];
    if (!isObject(item)) return { ok: false, error: `styleNotes.setMeta.${key} is required.` };
    for (const field of ["title", "badge", "note"] as const) {
      if (!asNonEmptyString(item[field])) return { ok: false, error: `styleNotes.setMeta.${key}.${field} is required.` };
    }
  }

  if (!isObject(pricing)) return { ok: false, error: "pricing is required." };
  if (!CURRENCIES.has(String(pricing.currency))) {
    return { ok: false, error: "pricing.currency is invalid." };
  }
  if (pricing.locale !== undefined && !asNonEmptyString(pricing.locale)) {
    return { ok: false, error: "pricing.locale must be a non-empty string when provided." };
  }
  if (pricing.marketLabel !== undefined && !asNonEmptyString(pricing.marketLabel)) {
    return { ok: false, error: "pricing.marketLabel must be a non-empty string when provided." };
  }
  if (pricing.enforceUniquePerPage !== undefined && typeof pricing.enforceUniquePerPage !== "boolean") {
    return { ok: false, error: "pricing.enforceUniquePerPage must be a boolean when provided." };
  }
  if (pricing.relatedProductLimit !== undefined) {
    const limit = Number(pricing.relatedProductLimit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 6) {
      return { ok: false, error: "pricing.relatedProductLimit must be a number between 1 and 6 when provided." };
    }
  }

  if (!Array.isArray(collectionFilters) || collectionFilters.length === 0) {
    return { ok: false, error: "collectionFilters must contain at least one item." };
  }
  const collectionFilterIds = new Set<string>();
  for (let i = 0; i < collectionFilters.length; i += 1) {
    const filter = collectionFilters[i];
    if (!isObject(filter)) return { ok: false, error: `collectionFilters #${i + 1}: invalid object.` };
    const filterId = asNonEmptyString(filter.id);
    if (!filterId) return { ok: false, error: `collectionFilters #${i + 1}: id is required.` };
    if (!asNonEmptyString(filter.label)) return { ok: false, error: `collectionFilters #${i + 1}: label is required.` };
    if (!FILTER_KINDS.has(String(filter.kind))) return { ok: false, error: `collectionFilters #${i + 1}: kind is invalid.` };
    if (collectionFilterIds.has(filterId)) return { ok: false, error: `collectionFilters contains duplicate id "${filterId}".` };
    collectionFilterIds.add(filterId);
  }

  if (!Array.isArray(productCatalog) || productCatalog.length === 0) {
    return { ok: false, error: "productCatalog must contain at least one item." };
  }
  const productIds = new Set<string>();
  for (let i = 0; i < productCatalog.length; i += 1) {
    const error = validateProduct(productCatalog[i], i);
    if (error) return { ok: false, error };
    const productId = (productCatalog[i] as FashionProduct).id.trim();
    if (productIds.has(productId)) return { ok: false, error: `productCatalog contains duplicate id "${productId}".` };
    productIds.add(productId);
  }

  const spotlightId = typeof value.collectionSpotlightProductId === "string" ? value.collectionSpotlightProductId.trim() : "";
  if (!spotlightId) return { ok: false, error: "collectionSpotlightProductId is required." };
  if (!productIds.has(spotlightId)) {
    return { ok: false, error: `collectionSpotlightProductId references unknown product id "${spotlightId}".` };
  }

  if (!isObject(styleSetAssignments)) return { ok: false, error: "styleSetAssignments is required." };
  for (const key of STYLE_SET_KEYS) {
    const error = validateReferenceList(styleSetAssignments[key], productIds, `styleSetAssignments.${key}`);
    if (error) return { ok: false, error };
  }

  for (const key of ["editorialStoryProductIds", "editorialChapterProductIds", "editorialRelatedProductIds"] as const) {
    const error = validateReferenceList(value[key], productIds, key);
    if (error) return { ok: false, error };
  }

  if (!isObject(bundleAssignments)) return { ok: false, error: "bundleAssignments is required." };
  for (const [bundleId, productIdList] of Object.entries(bundleAssignments)) {
    if (!bundleId.trim()) return { ok: false, error: "bundleAssignments contains an empty bundle id." };
    const error = validateReferenceList(productIdList, productIds, `bundleAssignments.${bundleId}`);
    if (error) return { ok: false, error };
  }

  if (!isObject(bundleMeta)) return { ok: false, error: "bundleMeta is required." };
  for (const bundleId of Object.keys(bundleAssignments)) {
    const item = bundleMeta[bundleId];
    if (!isObject(item)) return { ok: false, error: `bundleMeta.${bundleId} is required.` };
    if (!asNonEmptyString(item.title)) return { ok: false, error: `bundleMeta.${bundleId}.title is required.` };
    if (!asNonEmptyString(item.note)) return { ok: false, error: `bundleMeta.${bundleId}.note is required.` };
  }
  for (const bundleId of Object.keys(bundleMeta)) {
    if (!(bundleId in bundleAssignments)) {
      return { ok: false, error: `bundleMeta contains unknown bundle key "${bundleId}".` };
    }
  }

  const trustPoints = asStringArray(value.trustPoints);
  if (!trustPoints || trustPoints.length === 0) return { ok: false, error: "trustPoints must contain at least one item." };

  if (!Array.isArray(value.highlights) || value.highlights.length === 0) {
    return { ok: false, error: "highlights must contain at least one item." };
  }
  for (let i = 0; i < value.highlights.length; i += 1) {
    const highlight = value.highlights[i];
    if (!isObject(highlight)) return { ok: false, error: `highlights #${i + 1}: invalid object.` };
    for (const key of ["title", "subtitle", "cta", "palette"] as const) {
      if (!asNonEmptyString(highlight[key])) return { ok: false, error: `highlights #${i + 1}: ${key} is required.` };
    }
  }

  if (!isObject(whatsapp)) return { ok: false, error: "whatsapp is required." };
  for (const key of ["phoneNumber", "productCta", "fitCta", "lookCta", "storyCta", "disclaimer"] as const) {
    if (!asNonEmptyString(whatsapp[key])) return { ok: false, error: `whatsapp.${key} is required.` };
  }

  if (!Array.isArray(homepageSlides) || homepageSlides.length === 0) {
    return { ok: false, error: "homepageSlides must contain at least one item." };
  }
  const homepageSlideIds = new Set<string>();
  for (let i = 0; i < homepageSlides.length; i += 1) {
    const error = validateHeroSlide(homepageSlides[i], "homepageSlides", i);
    if (error) return { ok: false, error };
    const id = String((homepageSlides[i] as { id: string }).id).trim();
    if (homepageSlideIds.has(id)) return { ok: false, error: `homepageSlides contains duplicate id "${id}".` };
    homepageSlideIds.add(id);
  }

  if (!Array.isArray(editorialSlides) || editorialSlides.length === 0) {
    return { ok: false, error: "editorialSlides must contain at least one item." };
  }
  const editorialSlideIds = new Set<string>();
  for (let i = 0; i < editorialSlides.length; i += 1) {
    const error = validateHeroSlide(editorialSlides[i], "editorialSlides", i);
    if (error) return { ok: false, error };
    const id = String((editorialSlides[i] as { id: string }).id).trim();
    if (editorialSlideIds.has(id)) return { ok: false, error: `editorialSlides contains duplicate id "${id}".` };
    editorialSlideIds.add(id);
  }

  if (!isObject(homepageAssignments)) return { ok: false, error: "homepageAssignments is required." };
  for (const key of HOMEPAGE_BLOCK_IDS) {
    const error = validateReferenceList(homepageAssignments[key], productIds, `homepageAssignments.${key}`);
    if (error) return { ok: false, error };
  }

  return {
    ok: true,
    content: clone(value as FashionContent)
  };
};
