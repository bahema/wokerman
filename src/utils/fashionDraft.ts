import {
  fashionHero,
  fashionHighlights,
  fashionHeroSlides,
  fashionTrustPoints,
  featuredFashionProducts,
  trendRail,
  type FashionHighlight,
  type FashionHeroSlide,
  type FashionProduct
} from "../data/fashionCatalog";
import { apiGet } from "../api/client";
import type { FashionCurrencyCode } from "../../shared/fashionTypes";

export type FashionHomepageBlockId =
  | "featured-stories"
  | "storefront-hero"
  | "featured-drops"
  | "trending-now"
  | "complete-the-look"
  | "accessories"
  | "most-asked"
  | "best-seller"
  | "editors-picks"
  | "elevated-edit"
  | "shop-the-drop"
  | "why-shop-here"
  | "footer";

export type FashionBossDraft = {
  homepage: {
    storiesEyebrow: string;
    storiesTitle: string;
    storiesSupportNote: string;
    heroEyebrow: string;
    heroHeadline: string;
    heroSubtext: string;
    heroPrimaryCtaLabel: string;
    heroSecondaryCtaLabel: string;
    storefrontFocusEyebrow: string;
    storefrontFocusCardTitle: string;
    storefrontFocusCardHeadline: string;
    storefrontFocusCardNote: string;
    storefrontFocusStatOneLabel: string;
    storefrontFocusStatOneValue: string;
    storefrontFocusStatTwoLabel: string;
    storefrontFocusStatTwoValue: string;
    storefrontFocusStatThreeLabel: string;
    storefrontFocusStatThreeValue: string;
    storefrontFocusVisualLabel: string;
    storefrontFocusVisualNote: string;
    pageDirectionEyebrow: string;
    pageDirectionItemOne: string;
    pageDirectionItemTwo: string;
    pageDirectionItemThree: string;
    pageDirectionItemFour: string;
    featuredDropsEyebrow: string;
    featuredDropsTitle: string;
    completeLookEyebrow: string;
    completeLookTitle: string;
    completeLookCtaLabel: string;
    completeLookValueEyebrow: string;
    completeLookValueNote: string;
    accessoriesEyebrow: string;
    accessoriesTitle: string;
    accessoriesCtaLabel: string;
    elevatedEditEyebrow: string;
    elevatedEditTitle: string;
    mostAskedEyebrow: string;
    mostAskedTitle: string;
    mostAskedCtaLabel: string;
    bestSellerEyebrow: string;
    bestSellerTitle: string;
    bestSellerCtaLabel: string;
    editorsPicksEyebrow: string;
    editorsPicksTitle: string;
    editorsPicksCtaLabel: string;
    shopTheDropEyebrow: string;
    shopTheDropTitle: string;
    shopTheDropCtaLabel: string;
    trustEyebrow: string;
    trustTitle: string;
    trustDescription: string;
    footerEyebrow: string;
    footerIntroNote: string;
    footerSupportEyebrow: string;
    footerSupportTitle: string;
    footerLinksEyebrow: string;
    footerContactEyebrow: string;
    footerContactNote: string;
    footerStatusNote: string;
    footerLinkHomeLabel: string;
    footerLinkEditorialLabel: string;
    footerLinkCollectionsLabel: string;
    footerLinkStyleNotesLabel: string;
    modalWhyLabel: string;
    modalCommerceNotice: string;
    modalQuickPairEyebrow: string;
    modalQuickPairNote: string;
    modalFitCtaLabel: string;
    modalContinueLabel: string;
    modalPairTitle: string;
    modalPairNote: string;
    modalFeaturedRelatedLabel: string;
    modalEmptyRelatedNote: string;
    showTrending: boolean;
    showAccessories: boolean;
    showMostAsked: boolean;
    showBestSeller: boolean;
    showEditorsPicks: boolean;
  };
  collections: {
    pageTitle: string;
    pageIntro: string;
    defaultSort: "featured" | "newest" | "price-low" | "price-high";
    initialVisibleCount: number;
    loadMoreCount: number;
    loadMoreLabel: string;
    collectionInquiryLabel: string;
    spotlightMode: "auto" | "manual";
  };
  editorial: {
    introEyebrow: string;
    pageTitle: string;
    sliderTitle: string;
    introHeadline: string;
    introNote: string;
    campaignNotesTitle: string;
    campaignNotesNoteOne: string;
    campaignNotesNoteTwo: string;
    chapterTwoTitle: string;
    chapterThreeTitle: string;
    chapterTwoFeatureTitle: string;
    chapterTwoFeatureNote: string;
    chapterStoryTitle: string;
    chapterStoryDescription: string;
    chapterStoryFocusLabel: string;
    chapterStoryGoalLabel: string;
    chapterStoryActionLabel: string;
    relatedStripTitle: string;
    relatedStripSubtitle: string;
    finalChapterFeatureTitle: string;
    finalChapterFeatureNote: string;
    finalChapterTitle: string;
    finalChapterDescription: string;
    shopStoryEyebrow: string;
    shopStoryTitle: string;
    storyCtaLabel: string;
    chapterCtaLabel: string;
    storyTitle: string;
    storyNote: string;
    introPrimaryImage?: string;
    introSecondaryImage?: string;
    introTertiaryImage?: string;
    campaignNotesImage?: string;
    chapterTwoPrimaryImage?: string;
    chapterTwoSecondaryImage?: string;
    chapterTwoTertiaryImage?: string;
    finalChapterPrimaryImage?: string;
    finalChapterSecondaryImage?: string;
    finalChapterTertiaryImage?: string;
  };
  styleNotes: {
    defaultSet: "office" | "weekend" | "evening" | "travel";
    pageTitle: string;
    heroImage?: string;
    panelImage?: string;
    introNotes: string[];
    lookCtaLabel: string;
    fitCtaLabel: string;
    helperTitle: string;
    panelIntro: string;
    pairingEyebrow: string;
    setMeta: Record<
      "office" | "weekend" | "evening" | "travel",
      {
        title: string;
        badge: string;
        note: string;
      }
    >;
  };
  pricing: {
    currency: FashionCurrencyCode;
    locale?: string;
    marketLabel?: string;
    enforceUniquePerPage?: boolean;
    relatedProductLimit?: number;
  };
  collectionFilters: Array<{
    id: string;
    label: string;
    kind: "system" | "category" | "custom";
  }>;
  collectionSpotlightProductId: string;
  styleSetAssignments: Record<FashionBossDraft["styleNotes"]["defaultSet"], string[]>;
  editorialStoryProductIds: string[];
  editorialChapterProductIds: string[];
  editorialRelatedProductIds: string[];
  bundleAssignments: Record<string, string[]>;
  bundleMeta: Record<string, { title: string; note: string }>;
  trustPoints: string[];
  highlights: FashionHighlight[];
  whatsapp: {
    phoneNumber: string;
    productCta: string;
    fitCta: string;
    lookCta: string;
    storyCta: string;
    generalMessageTemplate: string;
    productMessageTemplate: string;
    fitMessageTemplate: string;
    lookMessageTemplate: string;
    pairMessageTemplate: string;
    storyMessageTemplate: string;
    disclaimer: string;
  };
  productCatalog: FashionProduct[];
  homepageSlides: FashionHeroSlide[];
  editorialSlides: FashionHeroSlide[];
  homepageAssignments: Record<FashionHomepageBlockId, string[]>;
};

export type FashionPublishedSource = "loading" | "live" | "cache" | "fallback" | "unavailable";

export type FashionPublishedState = {
  content: FashionBossDraft;
  source: FashionPublishedSource;
};

export const FASHION_PUBLISHED_CACHE_KEY = "autohub:fashion:published:cache:v1";

const defaultProductCatalog = [...featuredFashionProducts, ...trendRail];
const dedupeIds = (ids: string[]) => Array.from(new Set(ids));
const dedupeRecordIds = <T extends Record<string, string[]>>(value: T): T =>
  Object.fromEntries(Object.entries(value).map(([key, ids]) => [key, dedupeIds(ids)])) as T;

const deriveBundleAssignments = (products: FashionProduct[]) => {
  const map: Record<string, string[]> = {};
  products.forEach((product) => {
    product.bundleIds?.forEach((bundleId) => {
      map[bundleId] = [...(map[bundleId] ?? []), product.id];
    });
  });
  return map;
};

const createDefaultBundleMeta = (bundleAssignments: Record<string, string[]>) =>
  Object.keys(bundleAssignments).reduce<Record<string, { title: string; note: string }>>((acc, bundleId) => {
    const pretty = bundleId.replace(/-/g, " ");
    acc[bundleId] = {
      title: pretty.replace(/\b\w/g, (char) => char.toUpperCase()),
      note: "Group products here into complete looks or editorial stories before wiring them into live page sections."
    };
    return acc;
  }, {});

const defaultStyleSetAssignments = (products: FashionProduct[]): Record<FashionBossDraft["styleNotes"]["defaultSet"], string[]> => ({
  office: products.slice(1, 4).map((product) => product.id),
  weekend: products.slice(3, 6).map((product) => product.id),
  evening: products.slice(0, 3).map((product) => product.id),
  travel: products.slice(5, 8).map((product) => product.id)
});

const defaultCollectionFilters = (products: FashionProduct[]) => {
  const categoryFilters = Array.from(new Set(products.map((product) => product.category))).map((category) => ({
    id: `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label: category,
    kind: "category" as const
  }));

  return [
    { id: "all", label: "All", kind: "system" as const },
    { id: "new", label: "New", kind: "system" as const },
    { id: "trending", label: "Trending", kind: "system" as const },
    { id: "limited", label: "Limited", kind: "system" as const },
    ...categoryFilters
  ];
};

const defaultHomepageAssignments = (): Record<FashionHomepageBlockId, string[]> => ({
  "featured-stories": [],
  "storefront-hero": [],
  "featured-drops": defaultProductCatalog.slice(0, 3).map((product) => product.id),
  "trending-now": defaultProductCatalog.slice(1, 5).map((product) => product.id),
  "complete-the-look": defaultProductCatalog.slice(0, 3).map((product) => product.id),
  accessories: defaultProductCatalog.filter((product) => product.category.toLowerCase().includes("accessor") || product.category === "Bags").slice(0, 4).map((product) => product.id),
  "most-asked": defaultProductCatalog.slice(2, 5).map((product) => product.id),
  "best-seller": defaultProductCatalog.slice(0, 3).map((product) => product.id),
  "editors-picks": defaultProductCatalog.slice(3, 7).map((product) => product.id),
  "elevated-edit": defaultProductCatalog.slice(4, 8).map((product) => product.id),
  "shop-the-drop": defaultProductCatalog.slice(0, 8).map((product) => product.id),
  "why-shop-here": [],
  footer: []
});

export const createDefaultFashionBossDraft = (): FashionBossDraft => ({
  homepage: {
    storiesEyebrow: "Featured Stories",
    storiesTitle: "Featured Stories",
    storiesSupportNote: "Campaign-led hero stories that lead the Fashion experience.",
    heroEyebrow: fashionHero.eyebrow,
    heroHeadline: fashionHero.headline,
    heroSubtext: fashionHero.subtext,
    heroPrimaryCtaLabel: "Shop Collections",
    heroSecondaryCtaLabel: "View Editorial",
    storefrontFocusEyebrow: "Storefront Focus",
    storefrontFocusCardTitle: "Product-led homepage",
    storefrontFocusCardHeadline: "Curated + contact-first",
    storefrontFocusCardNote: "A cleaner visual storefront that moves from campaign discovery into product detail and WhatsApp without heavy checkout logic.",
    storefrontFocusStatOneLabel: "Route",
    storefrontFocusStatOneValue: "WhatsApp led",
    storefrontFocusStatTwoLabel: "Merch",
    storefrontFocusStatTwoValue: "Price + badge",
    storefrontFocusStatThreeLabel: "Depth",
    storefrontFocusStatThreeValue: "Related picks",
    storefrontFocusVisualLabel: "Visual merchandising",
    storefrontFocusVisualNote: "Large visual blocks on the right now support the storefront message with a magazine-like presentation instead of stacked utility text.",
    pageDirectionEyebrow: "Page Direction",
    pageDirectionItemOne: "Featured Stories now leads the page",
    pageDirectionItemTwo: "The original storefront hero remains directly after it",
    pageDirectionItemThree: "Affiliate conversion stays lighter than full ecommerce",
    pageDirectionItemFour: "Related product upsell remains inside the modal only",
    featuredDropsEyebrow: "Featured Drops",
    featuredDropsTitle: "Stronger merchandising blocks for immediate browsing.",
    completeLookEyebrow: "Complete the look",
    completeLookTitle: "Promote a full outfit, not only one item.",
    completeLookCtaLabel: "Send this look on WhatsApp",
    completeLookValueEyebrow: "Set value",
    completeLookValueNote: "Use this block to push grouped outfit interest before the user leaves for WhatsApp. It performs better than promoting single items in isolation.",
    accessoriesEyebrow: "Accessories that complete the look",
    accessoriesTitle: "Push the smaller add-ons that raise the full outfit value.",
    accessoriesCtaLabel: "Browse accessories",
    elevatedEditEyebrow: "Elevated edit",
    elevatedEditTitle: "A second controlled rail for high-attention pieces with stronger movement.",
    mostAskedEyebrow: "Most Asked on WhatsApp",
    mostAskedTitle: "Highlight the pieces that convert fastest in direct chat.",
    mostAskedCtaLabel: "Explore more pieces",
    bestSellerEyebrow: "Best seller this week",
    bestSellerTitle: "Separate your strongest weekly movers from chat-driven inquiries.",
    bestSellerCtaLabel: "View all best picks",
    editorsPicksEyebrow: "Editor’s picks",
    editorsPicksTitle: "Push premium, limited, and high-attention pieces in a cleaner spotlight.",
    editorsPicksCtaLabel: "Open editorial",
    shopTheDropEyebrow: "Shop the Drop",
    shopTheDropTitle: "Real product-style cards with pricing, badges, and collection labels.",
    shopTheDropCtaLabel: "Open style notes",
    trustEyebrow: "Why shop here",
    trustTitle: "Keep it premium, curated, and fast to navigate.",
    trustDescription:
      "This is not trying to be a giant marketplace. It is a cleaner personal-scale fashion storefront: curated products, stronger visual blocks, and clearer conversion paths.",
    footerEyebrow: "Fashion footer",
    footerIntroNote: "This is the dedicated closing area for navigation, trust, and direct client contact.",
    footerSupportEyebrow: "Fashion Support",
    footerSupportTitle: "A direct affiliate storefront built to move users into client conversations fast.",
    footerLinksEyebrow: "Quick links",
    footerContactEyebrow: "Direct contact",
    footerContactNote: "Use WhatsApp for item inquiries, fit guidance, and full-look recommendations without a heavy checkout system.",
    footerStatusNote: "Curated weekly • Client-managed replies",
    footerLinkHomeLabel: "New Arrivals",
    footerLinkEditorialLabel: "Editorial",
    footerLinkCollectionsLabel: "Collections",
    footerLinkStyleNotesLabel: "Style Notes",
    modalWhyLabel: "Why this piece",
    modalCommerceNotice: "This is affiliate commerce. Orders are handled directly through WhatsApp, not through an internal checkout flow.",
    modalQuickPairEyebrow: "Quick pair",
    modalQuickPairNote: "Add-on upsell",
    modalFitCtaLabel: "Ask about size",
    modalContinueLabel: "Continue browsing",
    modalPairTitle: "Pair with these",
    modalPairNote: "Same collection or tone",
    modalFeaturedRelatedLabel: "Featured related",
    modalEmptyRelatedNote: "More related pieces will appear here as the fashion catalog grows.",
    showTrending: true,
    showAccessories: true,
    showMostAsked: true,
    showBestSeller: true,
    showEditorsPicks: true
  },
  collections: {
    pageTitle: "A dedicated shopping grid for faster product-style browsing.",
    pageIntro: "Browse the full curated catalog with a balanced mix of premium pieces, lighter accessories, and stronger weekly movers.",
    defaultSort: "featured",
    initialVisibleCount: 6,
    loadMoreCount: 4,
    loadMoreLabel: "Load more pieces",
    collectionInquiryLabel: "Ask about this collection",
    spotlightMode: "auto"
  },
  editorial: {
    introEyebrow: "Editorial Edit",
    pageTitle: "Editorial stories should promote full looks, not loose products.",
    sliderTitle: "Campaign Stories",
    introHeadline: "A fashion editorial page built like a campaign story, not a plain catalog.",
    introNote:
      "This page is separated from the main Fashion landing page so it can carry a stronger campaign-driven layout, larger visual hierarchy, and cleaner storytelling for featured looks.",
    campaignNotesTitle: "Campaign Notes",
    campaignNotesNoteOne: "Use this page for your strongest seasonal narrative, premium arrivals, and curated looks that deserve larger storytelling space.",
    campaignNotesNoteTwo: "Unlike the landing page, this design is intentionally more editorial and asymmetric so the brand feels elevated, not generic.",
    chapterTwoTitle: "Chapter Two",
    chapterThreeTitle: "Chapter Three",
    chapterTwoFeatureTitle: "After-dark contrast",
    chapterTwoFeatureNote: "Use a second campaign chapter to deepen the story and push a more focused set without flattening the editorial page into one repeated block.",
    chapterStoryTitle: "Build the editorial page in chapters so each set gets its own premium spotlight.",
    chapterStoryDescription:
      "This extra campaign block gives the page more visual rhythm and makes it easier to push a second narrative angle before the user reaches the product-linked editorial cards.",
    chapterStoryFocusLabel: "One theme",
    chapterStoryGoalLabel: "Stronger recall",
    chapterStoryActionLabel: "WhatsApp-ready",
    relatedStripTitle: "Related story strip",
    relatedStripSubtitle: "Add another visual bridge before the final editorial product block.",
    finalChapterFeatureTitle: "Soft contrast balance",
    finalChapterFeatureNote: "A final story chapter keeps the editorial page layered and prevents the close from feeling abrupt.",
    finalChapterTitle: "A third campaign layer keeps the page feeling editorial instead of repetitive.",
    finalChapterDescription: "Use this final chapter to keep attention on the campaign mood, then route users back into products and WhatsApp with less friction.",
    shopStoryEyebrow: "Shop this story",
    shopStoryTitle: "One editorial story, one grouped WhatsApp action.",
    storyCtaLabel: "Shop this story on WhatsApp",
    chapterCtaLabel: "Shop this chapter",
    storyTitle: "Monochrome Campaign Story",
    storyNote: "A tighter editorial set built around one lead silhouette and supporting pieces that can be sold together through one faster WhatsApp handoff.",
    introPrimaryImage: "",
    introSecondaryImage: "",
    introTertiaryImage: "",
    campaignNotesImage: "",
    chapterTwoPrimaryImage: "",
    chapterTwoSecondaryImage: "",
    chapterTwoTertiaryImage: "",
    finalChapterPrimaryImage: "",
    finalChapterSecondaryImage: "",
    finalChapterTertiaryImage: ""
  },
  styleNotes: {
    defaultSet: "office",
    pageTitle: "Guidance-led content deserves its own page, not a buried block.",
    heroImage: "",
    panelImage: "",
    introNotes: [
      "Use this page for style guidance, pairings, and look construction without cluttering the main shopping grid.",
      "Keep tone editorial but practical so customers can move from inspiration to purchase more quickly.",
      "This page is separated on purpose so the Fashion experience feels like a modern storefront system, not one long overloaded page."
    ],
    lookCtaLabel: "Send this look on WhatsApp",
    fitCtaLabel: "Ask about fit",
    helperTitle: "Why this set works",
    panelIntro: "Use these panels later for outfit pairing guidance, accessory logic, and quick shopper suggestions.",
    pairingEyebrow: "Curated pairing",
    setMeta: {
      office: {
        title: "Office Contrast",
        badge: "Office-ready",
        note: "Sharper structure, cleaner tones, and one small accent that keeps the whole set looking deliberate."
      },
      weekend: {
        title: "Weekend Layering",
        badge: "Weekend pick",
        note: "A softer off-duty set built for lighter layering, easy movement, and cleaner casual promotion."
      },
      evening: {
        title: "Evening Contrast",
        badge: "Evening edit",
        note: "A darker evening-driven set that uses stronger contrast and a more polished silhouette for premium outreach."
      },
      travel: {
        title: "Travel Ease",
        badge: "Travel-ready",
        note: "A lighter movement-focused set built to keep the look polished while still feeling practical for transit and quick styling."
      }
    }
  },
  pricing: {
    currency: "USD",
    locale: "en-US",
    marketLabel: "Global",
    enforceUniquePerPage: true,
    relatedProductLimit: 3
  },
  collectionFilters: defaultCollectionFilters(defaultProductCatalog),
  collectionSpotlightProductId: defaultProductCatalog[0]?.id ?? "",
  styleSetAssignments: defaultStyleSetAssignments(defaultProductCatalog),
  editorialStoryProductIds: defaultProductCatalog.slice(0, 3).map((product) => product.id),
  editorialChapterProductIds: defaultProductCatalog
    .filter((product) => product.badgeType === "limited" || product.badgeType === "hot")
    .slice(0, 3)
    .map((product) => product.id),
  editorialRelatedProductIds: defaultProductCatalog
    .filter((product) => !defaultProductCatalog.slice(0, 3).some((pick) => pick.id === product.id))
    .slice(0, 4)
    .map((product) => product.id),
  bundleAssignments: deriveBundleAssignments(defaultProductCatalog),
  bundleMeta: createDefaultBundleMeta(deriveBundleAssignments(defaultProductCatalog)),
  trustPoints: fashionTrustPoints,
  highlights: fashionHighlights,
  whatsapp: {
    phoneNumber: "",
    productCta: "Order on WhatsApp",
    fitCta: "Ask about size",
    lookCta: "Send this look on WhatsApp",
    storyCta: "Shop this story on WhatsApp",
    generalMessageTemplate: "Hello, I want help with your fashion selections.\n{{disclaimer}}",
    productMessageTemplate:
      "{{product_note}}\nReference total: {{reference_total}}.\nPrice: {{price}}.\nCollection: {{collection}}.\nCategory: {{category}}.\nImage preview: {{image_link}}.\nProduct link: {{product_link}}.\nTone: {{tone}}.\nOccasion: {{occasion}}.\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}.",
    fitMessageTemplate:
      "Hello, I need fit and sizing guidance for {{product_name}}.\nReference total: {{reference_total}}.\nPrice: {{price}}.\nCollection: {{collection}}.\nFit: {{fit}}.\nOccasion: {{occasion}}.\nImage preview: {{image_link}}.\nProduct link: {{product_link}}.\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}.",
    lookMessageTemplate:
      "Hello, I want this look: {{title}}.\nReference total: {{total_price}}.\nItems:\n{{items_summary}}\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}.",
    pairMessageTemplate:
      "Hello, I want to order {{lead_product}} with these paired items.\nReference total: {{total_price}}.\nLead item: {{lead_product}}.\nLead image preview: {{lead_image_link}}.\nSelected pairings:\n{{items_summary}}\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}.",
    storyMessageTemplate:
      "Hello, I want this story set: {{title}}.\nReference total: {{total_price}}.\nItems:\n{{items_summary}}\nCTA: {{cta}}.\nSource: {{source}}.\nCustomer notes: {{customer_notes}}.",
    disclaimer: "All orders and inquiries are handled directly by the client on WhatsApp."
  },
  productCatalog: defaultProductCatalog,
  homepageSlides: fashionHeroSlides,
  editorialSlides: fashionHeroSlides.map((slide, index) => ({
    ...slide,
    id: `editorial-${index + 1}`
  })),
  homepageAssignments: defaultHomepageAssignments()
});

const readPublishedFashionCache = (): FashionBossDraft | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(FASHION_PUBLISHED_CACHE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as FashionBossDraft;
  } catch {
    return null;
  }
};

const getCachedPublishedFashionState = (): FashionPublishedState => {
  const cached = readPublishedFashionCache();
  if (cached) {
    return { content: cached, source: "cache" };
  }
  return { content: createDefaultFashionBossDraft(), source: "fallback" };
};

export const cachePublishedFashionContent = (content: FashionBossDraft) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FASHION_PUBLISHED_CACHE_KEY, JSON.stringify(content));
    window.dispatchEvent(new CustomEvent("fashion:published-cache-updated"));
  } catch {
    // Ignore storage quota/privacy errors.
  }
};

export const getCachedPublishedFashionContent = (): FashionBossDraft => {
  return getCachedPublishedFashionState().content;
};

export const getPublishedFashionContentStateAsync = async (): Promise<FashionPublishedState> => {
  try {
    const response = await apiGet<{ content: FashionBossDraft }>("/api/fashion/published");
    const content = response.content ?? createDefaultFashionBossDraft();
    cachePublishedFashionContent(content);
    return { content, source: "live" };
  } catch {
    return getCachedPublishedFashionState();
  }
};

export const getPublishedFashionContentAsync = async (): Promise<FashionBossDraft> => {
  const state = await getPublishedFashionContentStateAsync();
  return state.content;
};

export const buildFashionClientViewModel = (draft: FashionBossDraft) => {
  const defaults = createDefaultFashionBossDraft();
  const safeHomepageAssignments = dedupeRecordIds(draft.homepageAssignments ?? defaultHomepageAssignments());
  const safeStyleSetAssignments = dedupeRecordIds(draft.styleSetAssignments ?? defaultStyleSetAssignments(defaultProductCatalog));
  const safeEditorialStoryProductIds = dedupeIds(draft.editorialStoryProductIds?.length ? draft.editorialStoryProductIds : defaults.editorialStoryProductIds);
  const safeEditorialChapterProductIds = dedupeIds(draft.editorialChapterProductIds?.length ? draft.editorialChapterProductIds : defaults.editorialChapterProductIds);
  const safeEditorialRelatedProductIds = dedupeIds(draft.editorialRelatedProductIds?.length ? draft.editorialRelatedProductIds : defaults.editorialRelatedProductIds);
  const safeBundleAssignments = dedupeRecordIds(draft.bundleAssignments ?? deriveBundleAssignments(defaultProductCatalog));

  return {
    draft,
    homepage: { ...defaults.homepage, ...draft.homepage },
    collections: { ...defaults.collections, ...draft.collections },
    editorial: { ...defaults.editorial, ...draft.editorial },
    styleNotes: {
      ...defaults.styleNotes,
      ...draft.styleNotes,
      introNotes: draft.styleNotes?.introNotes?.length ? draft.styleNotes.introNotes : defaults.styleNotes.introNotes,
      setMeta: { ...defaults.styleNotes.setMeta, ...draft.styleNotes?.setMeta }
    },
    pricing: { ...defaults.pricing, ...draft.pricing },
    collectionFilters: draft.collectionFilters?.length ? draft.collectionFilters : defaultCollectionFilters(defaultProductCatalog),
    collectionSpotlightProductId: draft.collectionSpotlightProductId || defaultProductCatalog[0]?.id || "",
    styleSetAssignments: safeStyleSetAssignments,
    editorialStoryProductIds: safeEditorialStoryProductIds,
    editorialChapterProductIds: safeEditorialChapterProductIds,
    editorialRelatedProductIds: safeEditorialRelatedProductIds,
    bundleAssignments: safeBundleAssignments,
    bundleMeta: { ...createDefaultBundleMeta(safeBundleAssignments), ...(draft.bundleMeta ?? {}) },
    trustPoints: draft.trustPoints?.length ? draft.trustPoints : fashionTrustPoints,
    highlights: draft.highlights?.length ? draft.highlights : fashionHighlights,
    whatsapp: { ...defaults.whatsapp, ...(draft.whatsapp ?? {}) },
    productCatalog: draft.productCatalog?.length ? draft.productCatalog : defaultProductCatalog,
    homepageSlides: draft.homepageSlides?.length ? draft.homepageSlides : fashionHeroSlides,
    editorialSlides: draft.editorialSlides?.length
      ? draft.editorialSlides
      : fashionHeroSlides.map((slide, index) => ({
          ...slide,
          id: `editorial-${index + 1}`
        })),
    homepageAssignments: safeHomepageAssignments
  };
};

export const getFashionClientViewModel = () => buildFashionClientViewModel(getCachedPublishedFashionContent());

export const getFashionClientViewModelState = () => {
  const state = getCachedPublishedFashionState();
  return {
    viewModel: buildFashionClientViewModel(state.content),
    source: state.source
  };
};
