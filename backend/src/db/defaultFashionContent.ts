import type {
  FashionCollectionFilter,
  FashionContent,
  FashionHeroSlide,
  FashionHomepageBlockId,
  FashionProduct,
  FashionStyleSetKey
} from "../../../shared/fashionTypes";

const defaultProductCatalog: FashionProduct[] = [
  {
    id: "fashion-001",
    name: "Contour Wool Coat",
    collection: "Signature Outerwear",
    category: "Outerwear",
    price: 148,
    badge: "New",
    badgeType: "new",
    tone: "Charcoal",
    note: "A clean long-line coat built for structured layering and stronger campaign styling.",
    palette: "charcoal-sand",
    material: "Wool blend shell",
    fit: "Long tailored fit",
    occasion: "Work, evening layering",
    availabilityLabel: "Ready to order",
    styleTags: ["tailored", "outerwear", "monochrome"],
    ctaLabel: "Ask about this coat",
    whatsappNote: "Customer is interested in the Contour Wool Coat.",
    bundleIds: ["office-contrast", "evening-contrast"]
  },
  {
    id: "fashion-002",
    name: "Softline Tailored Blazer",
    collection: "Minimal Tailoring",
    category: "Tailoring",
    price: 92,
    badge: "Best Seller",
    badgeType: "best-seller",
    tone: "Sand",
    note: "Soft tailoring with a neutral palette that moves easily between work and dinner styling.",
    palette: "sand-cream",
    material: "Structured suiting blend",
    fit: "Relaxed tailored fit",
    occasion: "Work, smart casual",
    availabilityLabel: "In stock",
    styleTags: ["tailored", "blazer", "neutral"],
    ctaLabel: "Ask about this blazer",
    whatsappNote: "Customer is interested in the Softline Tailored Blazer.",
    bundleIds: ["office-contrast", "weekend-layering"]
  },
  {
    id: "fashion-003",
    name: "Column Knit Dress",
    collection: "Evening Minimal",
    category: "Dresses",
    price: 86,
    badge: "Trending",
    badgeType: "trending",
    tone: "Espresso",
    note: "A clean knit column silhouette designed for premium evening promotion.",
    palette: "espresso-amber",
    material: "Soft knit blend",
    fit: "Body-skimming fit",
    occasion: "Evening, event dressing",
    availabilityLabel: "Ready this week",
    styleTags: ["dress", "evening", "minimal"],
    ctaLabel: "Ask about this dress",
    whatsappNote: "Customer is interested in the Column Knit Dress.",
    bundleIds: ["evening-contrast"]
  },
  {
    id: "fashion-004",
    name: "Layered Travel Set",
    collection: "Transit Edit",
    category: "Sets",
    price: 114,
    badge: "Limited",
    badgeType: "limited",
    tone: "Stone",
    note: "A lighter coordinated set designed to stay polished through transit and quick outfit changes.",
    palette: "stone-taupe",
    material: "Soft woven blend",
    fit: "Easy relaxed fit",
    occasion: "Travel, daytime movement",
    availabilityLabel: "Limited release",
    styleTags: ["travel", "set", "layering"],
    ctaLabel: "Ask about this set",
    whatsappNote: "Customer is interested in the Layered Travel Set.",
    bundleIds: ["travel-ease", "weekend-layering"]
  },
  {
    id: "fashion-005",
    name: "Weekend Drape Shirt",
    collection: "Weekend Luxe",
    category: "Shirts",
    price: 58,
    badge: "Editor Pick",
    badgeType: "editor-pick",
    tone: "Ivory",
    note: "A fluid shirt built for softer off-duty styling with sharper presentation.",
    palette: "ivory-clay",
    material: "Drape cotton blend",
    fit: "Relaxed fit",
    occasion: "Weekend, daytime",
    availabilityLabel: "Ready to order",
    styleTags: ["weekend", "shirt", "layering"],
    ctaLabel: "Ask about this shirt",
    whatsappNote: "Customer is interested in the Weekend Drape Shirt.",
    bundleIds: ["weekend-layering", "travel-ease"]
  },
  {
    id: "fashion-006",
    name: "Minimal Leather Tote",
    collection: "Accessories Line",
    category: "Bags",
    price: 74,
    badge: "Hot",
    badgeType: "hot",
    tone: "Mocha",
    note: "A structured tote that keeps daily styling cleaner and more premium.",
    palette: "mocha-caramel",
    material: "Smooth vegan leather",
    fit: "Structured carry",
    occasion: "Daily use, office",
    availabilityLabel: "Fast moving",
    styleTags: ["accessories", "bag", "office"],
    ctaLabel: "Ask about this bag",
    whatsappNote: "Customer is interested in the Minimal Leather Tote.",
    bundleIds: ["office-contrast", "travel-ease"]
  },
  {
    id: "fashion-007",
    name: "Sharpline Trousers",
    collection: "Minimal Tailoring",
    category: "Tailoring",
    price: 68,
    badge: "New",
    badgeType: "new",
    tone: "Black",
    note: "Clean straight-leg tailoring for sharper campaign looks and easy repeat styling.",
    palette: "black-graphite",
    material: "Tailored suiting blend",
    fit: "Straight tailored fit",
    occasion: "Work, evening",
    availabilityLabel: "Ready to order",
    styleTags: ["tailored", "trousers", "monochrome"],
    ctaLabel: "Ask about these trousers",
    whatsappNote: "Customer is interested in the Sharpline Trousers.",
    bundleIds: ["office-contrast", "evening-contrast"]
  },
  {
    id: "fashion-008",
    name: "Evening Strap Heels",
    collection: "After Hours",
    category: "Shoes",
    price: 79,
    badge: "Trending",
    badgeType: "trending",
    tone: "Onyx",
    note: "A clean evening heel designed to sharpen darker looks without heavy visual clutter.",
    palette: "onyx-bronze",
    material: "Polished faux leather",
    fit: "True-to-size",
    occasion: "Evening, events",
    availabilityLabel: "In stock",
    styleTags: ["heels", "evening", "accessories"],
    ctaLabel: "Ask about these heels",
    whatsappNote: "Customer is interested in the Evening Strap Heels.",
    bundleIds: ["evening-contrast"]
  }
];

const deriveBundleAssignments = (products: FashionProduct[]) => {
  const map: Record<string, string[]> = {};
  for (const product of products) {
    for (const bundleId of product.bundleIds ?? []) {
      map[bundleId] = [...(map[bundleId] ?? []), product.id];
    }
  }
  return map;
};

const defaultCollectionFilters = (products: FashionProduct[]): FashionCollectionFilter[] => {
  const categories = Array.from(new Set(products.map((product) => product.category)));
  return [
    { id: "all", label: "All", kind: "system" },
    { id: "new", label: "New", kind: "system" },
    { id: "trending", label: "Trending", kind: "system" },
    { id: "limited", label: "Limited", kind: "system" },
    ...categories.map((category) => ({
      id: `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: category,
      kind: "category" as const
    }))
  ];
};

const defaultStyleSetAssignments = (products: FashionProduct[]): Record<FashionStyleSetKey, string[]> => ({
  office: [products[0], products[1], products[6]].map((product) => product.id),
  weekend: [products[1], products[4], products[5]].map((product) => product.id),
  evening: [products[0], products[2], products[7]].map((product) => product.id),
  travel: [products[3], products[4], products[5]].map((product) => product.id)
});

const defaultHomepageSlides: FashionHeroSlide[] = [
  {
    id: "hero-001",
    eyebrow: "Campaign One",
    badge: "New",
    headline: "Sharper tailoring made for daily luxury, not noisy fashion clutter.",
    subtext: "A cleaner campaign frame that pushes curated silhouettes and faster movement into direct inquiry.",
    primaryCta: "Shop Collections",
    secondaryCta: "View Editorial",
    primaryCtaHref: "/fashion/collections",
    secondaryCtaHref: "/fashion/editorial",
    palette: "charcoal-gradient",
    accent: "sand"
  },
  {
    id: "hero-002",
    eyebrow: "Weekend Luxe",
    badge: "Used",
    headline: "Soft structure, elevated layering, and a premium look without heavyweight ecommerce.",
    subtext: "This storefront stays lean with clearer product stories and direct WhatsApp handoff.",
    primaryCta: "Open Style Notes",
    secondaryCta: "Browse New Arrivals",
    primaryCtaHref: "/fashion/style-notes",
    secondaryCtaHref: "/fashion",
    palette: "stone-gradient",
    accent: "espresso"
  },
  {
    id: "hero-003",
    eyebrow: "Editorial Edit",
    badge: "New",
    headline: "Campaign-led presentation with product depth, related picks, and a clean affiliate route.",
    subtext: "The fashion layer blends editorial energy with direct product interaction and faster conversion flow.",
    primaryCta: "See Editorial",
    secondaryCta: "Explore Collections",
    primaryCtaHref: "/fashion/editorial",
    secondaryCtaHref: "/fashion/collections",
    palette: "bronze-gradient",
    accent: "ivory"
  }
];

const defaultEditorialSlides: FashionHeroSlide[] = defaultHomepageSlides.map((slide, index) => ({
  ...slide,
  id: `editorial-${index + 1}`
}));

const defaultHomepageAssignments = (): Record<FashionHomepageBlockId, string[]> => ({
  "featured-stories": [],
  "storefront-hero": [],
  "featured-drops": defaultProductCatalog.slice(0, 3).map((product) => product.id),
  "trending-now": [defaultProductCatalog[1], defaultProductCatalog[2], defaultProductCatalog[7], defaultProductCatalog[5]].map(
    (product) => product.id
  ),
  "complete-the-look": [defaultProductCatalog[0], defaultProductCatalog[1], defaultProductCatalog[6]].map((product) => product.id),
  accessories: [defaultProductCatalog[5], defaultProductCatalog[7]].map((product) => product.id),
  "most-asked": [defaultProductCatalog[0], defaultProductCatalog[3], defaultProductCatalog[5]].map((product) => product.id),
  "best-seller": [defaultProductCatalog[1], defaultProductCatalog[2], defaultProductCatalog[5]].map((product) => product.id),
  "editors-picks": [defaultProductCatalog[4], defaultProductCatalog[5], defaultProductCatalog[2]].map((product) => product.id),
  "elevated-edit": [defaultProductCatalog[0], defaultProductCatalog[2], defaultProductCatalog[7]].map((product) => product.id),
  "shop-the-drop": defaultProductCatalog.map((product) => product.id),
  "why-shop-here": [],
  footer: []
});

const defaultBundleAssignments = deriveBundleAssignments(defaultProductCatalog);

export const defaultFashionContent: FashionContent = {
  homepage: {
    storiesEyebrow: "Featured Stories",
    storiesTitle: "Featured Stories",
    storiesSupportNote: "Campaign-led hero stories that lead the Fashion experience.",
    heroEyebrow: "New Season Drop",
    heroHeadline: "A premium fashion storefront built for faster browsing and cleaner product focus.",
    heroSubtext:
      "The Fashion page behaves like a storefront layer: featured drops, product-led highlights, curated rows, and a cleaner path into collections.",
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
    editorsPicksEyebrow: "Editor's picks",
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
    pageIntro:
      "Browse the full curated catalog with a balanced mix of premium pieces, lighter accessories, and stronger weekly movers.",
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
    storyNote:
      "A tighter editorial set built around one lead silhouette and supporting pieces that can be sold together through one faster WhatsApp handoff.",
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
        note: "Sharper structure, cleaner tones, and one small accent that keeps the set looking deliberate."
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
        note: "A lighter movement-focused set built to keep the look polished while still feeling practical for transit."
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
  editorialChapterProductIds: [defaultProductCatalog[3], defaultProductCatalog[5], defaultProductCatalog[7]].map((product) => product.id),
  editorialRelatedProductIds: [defaultProductCatalog[1], defaultProductCatalog[4], defaultProductCatalog[6], defaultProductCatalog[2]].map(
    (product) => product.id
  ),
  bundleAssignments: defaultBundleAssignments,
  bundleMeta: {
    "office-contrast": {
      title: "Office Contrast",
      note: "A cleaner office set built around structure, neutral layering, and one sharp accessory."
    },
    "evening-contrast": {
      title: "Evening Contrast",
      note: "A darker evening-led grouping with stronger silhouette contrast and faster high-intent conversion."
    },
    "weekend-layering": {
      title: "Weekend Layering",
      note: "A softer off-duty combination designed for easier browsing and casual styling promotion."
    },
    "travel-ease": {
      title: "Travel Ease",
      note: "A practical movement-first set that keeps the look polished while remaining easy to recommend."
    }
  },
  trustPoints: [
    "Curated looks instead of a noisy oversized catalog.",
    "Direct WhatsApp handoff for faster inquiry and conversion.",
    "Editorial product groupings that sell complete looks, not isolated items."
  ],
  highlights: [
    {
      title: "Runway Utility",
      subtitle: "Structured staples designed to move from campaign imagery into daily styling without losing edge.",
      cta: "Shop now",
      palette: "bronze-runway"
    },
    {
      title: "Weekend Luxe",
      subtitle: "Relaxed layering pieces with soft tailoring and sharper silhouette contrast.",
      cta: "Explore edit",
      palette: "sand-weekend"
    },
    {
      title: "Evening Contrast",
      subtitle: "Darker palettes, stronger outerwear, and cleaner cuts for elevated after-hours styling.",
      cta: "View pieces",
      palette: "espresso-evening"
    }
  ],
  whatsapp: {
    phoneNumber: "+250700000000",
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
  homepageSlides: defaultHomepageSlides,
  editorialSlides: defaultEditorialSlides,
  homepageAssignments: defaultHomepageAssignments()
};
