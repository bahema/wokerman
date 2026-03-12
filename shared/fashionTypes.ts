export type FashionBadgeType = "new" | "used" | "best-seller" | "limited" | "trending" | "editor-pick" | "hot";

export type FashionCurrencyCode = "USD" | "EUR" | "GBP" | "RWF";

export type FashionStyleSetKey = "office" | "weekend" | "evening" | "travel";

export type FashionCollectionFilterKind = "system" | "category" | "custom";

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

export type FashionProduct = {
  id: string;
  name: string;
  collection: string;
  category: string;
  price: number;
  badge?: string;
  badgeType?: FashionBadgeType;
  tone: string;
  note: string;
  palette: string;
  material: string;
  fit: string;
  occasion: string;
  availabilityLabel: string;
  styleTags: string[];
  ctaLabel?: string;
  whatsappNote?: string;
  whatsappNumber?: string;
  bundleIds?: string[];
  primaryImage?: string;
  detailImage?: string;
  stylingImage?: string;
};

export type FashionHighlight = {
  title: string;
  subtitle: string;
  cta: string;
  palette: string;
};

export type FashionHeroSlide = {
  id: string;
  eyebrow: string;
  badge?: string;
  headline: string;
  subtext: string;
  primaryCta: string;
  secondaryCta: string;
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
  palette: string;
  accent: string;
  imageUrl?: string;
};

export type FashionCollectionFilter = {
  id: string;
  label: string;
  kind: FashionCollectionFilterKind;
};

export type FashionSetMeta = {
  title: string;
  badge: string;
  note: string;
};

export type FashionBundleMeta = {
  title: string;
  note: string;
};

export type FashionContent = {
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
    defaultSet: FashionStyleSetKey;
    pageTitle: string;
    heroImage?: string;
    panelImage?: string;
    introNotes: string[];
    lookCtaLabel: string;
    fitCtaLabel: string;
    helperTitle: string;
    panelIntro: string;
    pairingEyebrow: string;
    setMeta: Record<FashionStyleSetKey, FashionSetMeta>;
  };
  pricing: {
    currency: FashionCurrencyCode;
    locale?: string;
    marketLabel?: string;
    enforceUniquePerPage?: boolean;
    relatedProductLimit?: number;
  };
  collectionFilters: FashionCollectionFilter[];
  collectionSpotlightProductId: string;
  styleSetAssignments: Record<FashionStyleSetKey, string[]>;
  editorialStoryProductIds: string[];
  editorialChapterProductIds: string[];
  editorialRelatedProductIds: string[];
  bundleAssignments: Record<string, string[]>;
  bundleMeta: Record<string, FashionBundleMeta>;
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

export type FashionContentMeta = {
  updatedAt: string;
  hasDraft: boolean;
  publishedRevision: string;
  publishedProductCount: number;
  draftProductCount: number;
  homepageSlideCount: number;
  editorialSlideCount: number;
};

export type FashionVideoStatus = "draft" | "published";

export type FashionVideoPlacement = "landing" | "feed" | "series" | "promoted";

export type FashionVideoComment = {
  id: string;
  name: string;
  text: string;
  createdAt: string;
  status?: "visible" | "hidden" | "flagged";
  parentId?: string;
  likes?: number;
  dislikes?: number;
  reaction?: "like" | "dislike" | null;
  likedByViewer?: boolean;
  replies?: FashionVideoComment[];
};

export type FashionVideoRecord = {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  videoAsset: string;
  views: number;
  likes: number;
  dislikes: number;
  comments: FashionVideoComment[];
  status: FashionVideoStatus;
  placement: FashionVideoPlacement;
  series: string;
  mappedProductId: string;
  collection: string;
  category: string;
  tone: string;
  styleTags: string[];
  whatsappNumber: string;
  checkoutLabel: string;
  sourceLabel: string;
  isPromoted: boolean;
  sortOrder: number;
};

export type FashionVideoContent = {
  videos: FashionVideoRecord[];
};

export type FashionVideoContentMeta = {
  updatedAt: string;
  hasDraft: boolean;
  publishedRevision: string;
  publishedVideoCount: number;
  draftVideoCount: number;
  publishedPromotedCount: number;
};
