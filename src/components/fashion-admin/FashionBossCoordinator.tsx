import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import ThemeToggle from "../ThemeToggle";
import {
  fashionHeroSlides,
  fashionTrustPoints,
  featuredFashionProducts,
  trendRail,
  type FashionHeroSlide,
  type FashionProduct
} from "../../data/fashionCatalog";
import { withBasePath } from "../../utils/basePath";
import {
  createDefaultFashionBossDraft,
  type FashionBossDraft,
  type FashionHomepageBlockId
} from "../../utils/fashionDraft";
import {
  getFashionAdminInitialContentAsync,
  getFashionMetaAsync,
  publishFashionContent,
  resetFashionContentToDefaults,
  saveFashionDraftContent,
  type FashionMeta
} from "../../utils/fashionAdminStorage";
import {
  defaultFashionWhatsAppApiSettings,
  getFashionWhatsAppApiSettingsAsync,
  saveFashionWhatsAppApiSettingsAsync,
  type FashionWhatsAppApiSettings
} from "../../utils/fashionWhatsAppApi";
import { getEventThemeCssVars } from "../../utils/eventTheme";
import { getInitialTheme, type Theme, updateTheme } from "../../utils/theme";
import { deleteMediaItem, getMediaLibrary, uploadMediaFiles } from "../../utils/mediaLibrary";
import { openFashionStoryWhatsApp } from "../../utils/fashionWhatsApp";
import {
  deleteFashionInquiryAsync,
  getFashionInquiriesAsync,
  updateFashionInquiryAsync,
  type FashionInquiryAdminRecord,
  type FashionInquiryAdminUpdatePayload
} from "../../utils/fashionInquiryAdmin";
import { formatAdminTime } from "../../utils/adminTime";
import FashionAdminShell from "./FashionAdminShell";
import FashionAdminSidebar from "./FashionAdminSidebar";
import FashionAdminTopbar from "./FashionAdminTopbar";
import DashboardWorkspace from "./workspaces/DashboardWorkspace";
import ComplexStudioWorkspace from "./workspaces/ComplexStudioWorkspace";
import HomepageStudioWorkspace from "./workspaces/HomepageStudioWorkspace";
import CollectionsStudioWorkspace from "./workspaces/CollectionsStudioWorkspace";
import EditorialStudioWorkspace from "./workspaces/EditorialStudioWorkspace";
import StyleNotesStudioWorkspace from "./workspaces/StyleNotesStudioWorkspace";
import ProductLibraryWorkspace from "./workspaces/ProductLibraryWorkspace";
import MediaLibraryWorkspace from "./workspaces/MediaLibraryWorkspace";
import PublishCenterWorkspace from "./workspaces/PublishCenterWorkspace";
import WhatsAppSettingsWorkspace from "./workspaces/WhatsAppSettingsWorkspace";
import { FashionAdminButton, FashionAdminChip, FashionAdminSectionHeader, FashionAdminValidationPanel } from "./primitives";
import ProductAssignmentDrawer from "./ProductAssignmentDrawer";

type BossSection =
  | "dashboard"
  | "complex-studio"
  | "homepage-studio"
  | "collections-studio"
  | "editorial-studio"
  | "style-notes-studio"
  | "product-library"
  | "media-library"
  | "publish-center"
  | "whatsapp-settings";

const NEW_PRODUCT_ID = "__new__";

type ProductDraftState = {
  id: string;
  name: string;
  collection: string;
  category: string;
  price: string;
  whatsappNumber: string;
  material: string;
  fit: string;
  occasion: string;
  availabilityLabel: string;
  note: string;
  styleTags: string;
  badgeType: string;
  bundleIds: string;
  badge: string;
  primaryImage: string;
  detailImage: string;
  stylingImage: string;
};

type ProductPickerTarget =
  | { scope: "homepage"; blockId: HomepageBlockId }
  | { scope: "spotlight" }
  | { scope: "style" }
  | { scope: "bundle" }
  | { scope: "editorial-chapter"; index: number }
  | { scope: "editorial-story"; index: number }
  | { scope: "editorial-related"; index: number };

type MediaPickerSlot = "primaryImage" | "detailImage" | "stylingImage";
type SlideMediaTarget = { scope: "homepage" | "editorial"; slideId: string };
type EditorialMediaField =
  | "introPrimaryImage"
  | "introSecondaryImage"
  | "introTertiaryImage"
  | "campaignNotesImage"
  | "chapterTwoPrimaryImage"
  | "chapterTwoSecondaryImage"
  | "chapterTwoTertiaryImage"
  | "finalChapterPrimaryImage"
  | "finalChapterSecondaryImage"
  | "finalChapterTertiaryImage";
type StyleNotesMediaField = "heroImage" | "panelImage";

type MediaAsset = {
  id: string;
  kind: "image" | "video";
  name: string;
  url: string;
};

type ProductPickerContext = {
  title: string;
  subtitle: string;
  sectionLabel: string;
  previewLabel: string;
  sectionIds: string[];
  pageUsedIds: Set<string>;
  replaceIndex?: number;
  previewProducts: FashionProduct[];
};

const productBadgeOptions = ["new", "used", "best-seller", "limited", "trending", "editor-pick", "hot"] as const;
const slideBadgeOptions = ["New", "Used"] as const;
const dedupeIds = (ids: string[]) => Array.from(new Set(ids));
const dedupeRecordIds = (value: Record<string, string[]>) =>
  Object.fromEntries(Object.entries(value).map(([key, ids]) => [key, dedupeIds(ids)])) as Record<string, string[]>;
const editorialMediaFieldLabels: Record<EditorialMediaField, string> = {
  introPrimaryImage: "Intro primary image",
  introSecondaryImage: "Intro secondary image",
  introTertiaryImage: "Intro tertiary image",
  campaignNotesImage: "Campaign notes image",
  chapterTwoPrimaryImage: "Chapter two primary image",
  chapterTwoSecondaryImage: "Chapter two secondary image",
  chapterTwoTertiaryImage: "Chapter two tertiary image",
  finalChapterPrimaryImage: "Final chapter primary image",
  finalChapterSecondaryImage: "Final chapter secondary image",
  finalChapterTertiaryImage: "Final chapter tertiary image"
};
const styleNotesMediaFieldLabels: Record<StyleNotesMediaField, string> = {
  heroImage: "Style notes hero image",
  panelImage: "Style notes panel image"
};

const formatBadgeLabel = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const buildProductDraft = (product: FashionProduct | null): ProductDraftState => ({
  id: product?.id ?? NEW_PRODUCT_ID,
  name: product?.name ?? "",
  collection: product?.collection ?? "",
  category: product?.category ?? "",
  price: product ? String(product.price) : "",
  whatsappNumber: product?.whatsappNumber ?? "",
  material: product?.material ?? "",
  fit: product?.fit ?? "",
  occasion: product?.occasion ?? "",
  availabilityLabel: product?.availabilityLabel ?? "",
  note: product?.note ?? "",
  styleTags: product?.styleTags?.join(", ") ?? "",
  badgeType: product?.badgeType ?? "new",
  badge: product?.badge ?? (product?.badgeType ? formatBadgeLabel(product.badgeType) : "New"),
  bundleIds: product?.bundleIds?.join(", ") ?? "",
  primaryImage: product?.primaryImage ?? "",
  detailImage: product?.detailImage ?? "",
  stylingImage: product?.stylingImage ?? ""
});
type HomepageBlockId = FashionHomepageBlockId;

const homepageBlockDefinitions: Array<{
  id: HomepageBlockId;
  title: string;
  note: string;
  kind: "slides" | "copy" | "products" | "bundle" | "trust" | "footer";
  keyCount?: number;
}> = [
  { id: "featured-stories", title: "Featured Stories", note: "Top campaign slider with slide cards and hero story text.", kind: "slides", keyCount: fashionHeroSlides.length },
  { id: "storefront-hero", title: "Storefront Hero", note: "Controls the second hero block, copy, and primary page CTA direction.", kind: "copy" },
  { id: "featured-drops", title: "Featured Drops", note: "Manual promo cards for the first merchandising block.", kind: "products" },
  { id: "trending-now", title: "Trending Now", note: "Horizontal rail with manually arranged high-momentum pieces.", kind: "products" },
  { id: "complete-the-look", title: "Complete the Look", note: "Lead item plus companion pieces with one grouped conversion action.", kind: "bundle" },
  { id: "accessories", title: "Accessories", note: "Accessory-driven promo strip tied to supporting pieces.", kind: "products" },
  { id: "most-asked", title: "Most Asked on WhatsApp", note: "High-intent products surfaced for fast contact conversion.", kind: "products" },
  { id: "best-seller", title: "Best Seller This Week", note: "Best-selling promo strip with ranked products.", kind: "products" },
  { id: "editors-picks", title: "Editor’s Picks", note: "Manual picks for premium emphasis and editorial authority.", kind: "products" },
  { id: "elevated-edit", title: "Elevated Edit", note: "Secondary rail for polished cross-sell discovery.", kind: "products" },
  { id: "shop-the-drop", title: "Shop the Drop", note: "Main grid intake for visible products on the homepage.", kind: "products" },
  { id: "why-shop-here", title: "Why Shop Here", note: "Trust-value cards that reinforce conversion confidence.", kind: "trust", keyCount: fashionTrustPoints.length },
  { id: "footer", title: "Footer", note: "Closing navigation and direct-contact CTA block.", kind: "footer" }
];

const defaultHomepageAssignments = (): Record<HomepageBlockId, string[]> => ({
  "featured-stories": [],
  "storefront-hero": [],
  "featured-drops": defaultProducts.slice(0, 3).map((product) => product.id),
  "trending-now": defaultProducts.slice(1, 5).map((product) => product.id),
  "complete-the-look": defaultProducts.slice(0, 3).map((product) => product.id),
  accessories: defaultProducts.filter((product) => product.category.toLowerCase().includes("accessor")).slice(0, 4).map((product) => product.id),
  "most-asked": defaultProducts.slice(2, 5).map((product) => product.id),
  "best-seller": defaultProducts.slice(0, 3).map((product) => product.id),
  "editors-picks": defaultProducts.slice(3, 7).map((product) => product.id),
  "elevated-edit": defaultProducts.slice(4, 8).map((product) => product.id),
  "shop-the-drop": defaultProducts.slice(0, 8).map((product) => product.id),
  "why-shop-here": [],
  footer: []
});

type SectionDefinition = {
  id: BossSection;
  label: string;
  note: string;
  route?: string;
  keys: string[];
};

const sectionGroups: Array<{ title: string; items: SectionDefinition[] }> = [
  {
    title: "Core",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        note: "Quick operating view for publish status and live page access.",
        keys: ["Counts", "Preview", "Status"]
      },
      {
        id: "publish-center",
        label: "Publish Center",
        note: "Review draft/published state, validate, and run final publish actions.",
        keys: ["Draft", "Validation", "Publish"]
      }
    ]
  },
  {
    title: "Studios",
    items: [
      {
        id: "complex-studio",
        label: "Complex Studio",
        note: "Visual product assignment workspace that opens contextual add/replace drawer flows.",
        keys: ["Context", "Assign", "Preview"]
      },
      {
        id: "homepage-studio",
        label: "Homepage Studio",
        note: "Controls the /fashion landing stack and every homepage promo layer.",
        route: "/fashion",
        keys: ["Hero", "Stories", "Promo blocks"]
      },
      {
        id: "collections-studio",
        label: "Collections Studio",
        note: "Controls filters, spotlight, browse pacing, and collection inquiry prompts.",
        route: "/fashion/collections",
        keys: ["Filters", "Spotlight", "Load more"]
      },
      {
        id: "editorial-studio",
        label: "Editorial Studio",
        note: "Controls campaign stories, chapters, and grouped editorial conversion.",
        route: "/fashion/editorial",
        keys: ["Slider", "Chapters", "Bundles"]
      },
      {
        id: "style-notes-studio",
        label: "Style Notes Studio",
        note: "Controls outfit sets, fit prompts, and guided WhatsApp conversion.",
        route: "/fashion/style-notes",
        keys: ["Sets", "Fit CTA", "Look CTA"]
      }
    ]
  },
  {
    title: "Libraries",
    items: [
      {
        id: "product-library",
        label: "Product Library",
        note: "Controls the fashion item source used by every public-facing page.",
        keys: ["Catalog", "Metadata", "Pricing"]
      },
      {
        id: "media-library",
        label: "Media Library",
        note: "Receives image and video assets so item editors choose from the web library, not direct computer fields.",
        keys: ["Images", "Videos", "Library"]
      },
      {
        id: "whatsapp-settings",
        label: "WhatsApp/CTA Settings",
        note: "Controls direct client-contact wording, target number, and affiliate prompts.",
        keys: ["Templates", "Target", "Disclaimer"]
      }
    ]
  }
];

const defaultProducts = [...featuredFashionProducts, ...trendRail];

const initialMediaLibrary: MediaAsset[] = [];

const sectionCard =
  "fa-card p-5";

const FashionBoss = () => {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [activeSection, setActiveSection] = useState<BossSection>("dashboard");
  const [draft, setDraft] = useState<FashionBossDraft>(() => createDefaultFashionBossDraft());
  const [catalogProducts, setCatalogProducts] = useState<FashionProduct[]>(() => (draft.productCatalog?.length ? draft.productCatalog : defaultProducts));
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [homepageSlides, setHomepageSlides] = useState<FashionHeroSlide[]>(() => (draft.homepageSlides?.length ? draft.homepageSlides : fashionHeroSlides));
  const [editorialSlides, setEditorialSlides] = useState<FashionHeroSlide[]>(() =>
    draft.editorialSlides?.length
      ? draft.editorialSlides
      : fashionHeroSlides.map((slide, index) => ({
          ...slide,
          id: `editorial-${index + 1}`
        }))
  );
  const [selectedHomepageSlideId, setSelectedHomepageSlideId] = useState<string>("");
  const [selectedEditorialSlideId, setSelectedEditorialSlideId] = useState<string>("");
  const [selectedHomepageBlock, setSelectedHomepageBlock] = useState<HomepageBlockId>("featured-stories");
  const [homepageAssignments, setHomepageAssignments] = useState<Record<HomepageBlockId, string[]>>(() => draft.homepageAssignments ?? defaultHomepageAssignments());
  const [selectedCollectionPanel, setSelectedCollectionPanel] = useState<"filters" | "spotlight" | "browse">("filters");
  const [selectedEditorialPanel, setSelectedEditorialPanel] = useState<"slider" | "chapters" | "story-cta">("slider");
  const [selectedWhatsAppPanel, setSelectedWhatsAppPanel] = useState<"templates" | "preview" | "destination" | "inquiries">("templates");
  const [recentInquiries, setRecentInquiries] = useState<FashionInquiryAdminRecord[]>([]);
  const [isMutatingInquiry, setIsMutatingInquiry] = useState(false);
  const [styleSetAssignments, setStyleSetAssignments] = useState<Record<FashionBossDraft["styleNotes"]["defaultSet"], string[]>>(() => draft.styleSetAssignments);
  const [bundleAssignments, setBundleAssignments] = useState<Record<string, string[]>>(() => draft.bundleAssignments);
  const [selectedBundleId, setSelectedBundleId] = useState<string>(() => Object.keys(draft.bundleAssignments)[0] ?? "featured-look");
  const [productSearch, setProductSearch] = useState("");
  const [customCollectionChips, setCustomCollectionChips] = useState<Array<{ id: string; label: string; count: number; kind: "custom" }>>(
    () =>
      draft.collectionFilters
        .filter((filter) => filter.kind === "custom")
        .map((filter) => ({ id: filter.id, label: filter.label, count: Math.max(1, draft.collections.initialVisibleCount), kind: "custom" as const }))
  );
  const [selectedCollectionSpotlightId, setSelectedCollectionSpotlightId] = useState<string>(draft.collectionSpotlightProductId || defaultProducts[0]?.id || "");
  const [editorialStoryProductIds, setEditorialStoryProductIds] = useState<string[]>(() => draft.editorialStoryProductIds);
  const [editorialChapterProductIds, setEditorialChapterProductIds] = useState<string[]>(() => draft.editorialChapterProductIds);
  const [editorialRelatedProductIds, setEditorialRelatedProductIds] = useState<string[]>(() => draft.editorialRelatedProductIds);
  const [productDraft, setProductDraft] = useState<ProductDraftState>(() => buildProductDraft(null));
  const [productDraftSavedAt, setProductDraftSavedAt] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSavingRemote, setIsSavingRemote] = useState(false);
  const [isPublishingRemote, setIsPublishingRemote] = useState(false);
  const [isResettingRemote, setIsResettingRemote] = useState(false);
  const [isSavingWhatsAppApi, setIsSavingWhatsAppApi] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [whatsAppApiSettings, setWhatsAppApiSettings] = useState<FashionWhatsAppApiSettings>(() => defaultFashionWhatsAppApiSettings());
  const [fashionMeta, setFashionMeta] = useState<FashionMeta | null>(null);
  const [productPickerTarget, setProductPickerTarget] = useState<ProductPickerTarget | null>(null);
  const [productPickerQuery, setProductPickerQuery] = useState("");
  const [mediaPickerSlot, setMediaPickerSlot] = useState<MediaPickerSlot | null>(null);
  const [slideMediaTarget, setSlideMediaTarget] = useState<SlideMediaTarget | null>(null);
  const [editorialMediaField, setEditorialMediaField] = useState<EditorialMediaField | null>(null);
  const [styleNotesMediaField, setStyleNotesMediaField] = useState<StyleNotesMediaField | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(() => initialMediaLibrary);
  const [mediaPickerQuery, setMediaPickerQuery] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaStatusMessage, setMediaStatusMessage] = useState<string | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = window.setTimeout(() => setActionMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  useEffect(() => {
    if (!productPickerTarget) {
      setProductPickerQuery("");
    }
  }, [productPickerTarget]);

  const eventThemeVars = useMemo(() => getEventThemeCssVars("none", theme), [theme]);
  const allProducts = useMemo(() => catalogProducts, [catalogProducts]);

  const applyDraftState = (next: FashionBossDraft) => {
    const sanitizedHomepageAssignments = dedupeRecordIds(next.homepageAssignments);
    const sanitizedStyleSetAssignments = dedupeRecordIds(next.styleSetAssignments as Record<string, string[]>) as FashionBossDraft["styleSetAssignments"];
    const sanitizedBundleAssignments = dedupeRecordIds(next.bundleAssignments);
    const sanitizedEditorialStory = dedupeIds(next.editorialStoryProductIds);
    const sanitizedEditorialChapter = dedupeIds(next.editorialChapterProductIds);
    const sanitizedEditorialRelated = dedupeIds(next.editorialRelatedProductIds);
    setDraft(next);
    setCatalogProducts(next.productCatalog);
    setHomepageSlides(next.homepageSlides);
    setEditorialSlides(next.editorialSlides);
    setSelectedProductId((current) => {
      if (current === NEW_PRODUCT_ID) return current;
      return current && next.productCatalog.some((product) => product.id === current) ? current : "";
    });
    setSelectedHomepageSlideId((current) => (current && next.homepageSlides.some((slide) => slide.id === current) ? current : ""));
    setSelectedEditorialSlideId((current) => (current && next.editorialSlides.some((slide) => slide.id === current) ? current : ""));
    setHomepageAssignments(sanitizedHomepageAssignments);
    setStyleSetAssignments(sanitizedStyleSetAssignments);
    setBundleAssignments(sanitizedBundleAssignments);
    setSelectedBundleId(Object.keys(sanitizedBundleAssignments)[0] ?? "featured-look");
    setCustomCollectionChips(
      next.collectionFilters
        .filter((filter) => filter.kind === "custom")
        .map((filter) => ({ id: filter.id, label: filter.label, count: Math.max(1, next.collections.initialVisibleCount), kind: "custom" as const }))
    );
    setSelectedCollectionSpotlightId(next.collectionSpotlightProductId);
    setEditorialStoryProductIds(sanitizedEditorialStory);
    setEditorialChapterProductIds(sanitizedEditorialChapter);
    setEditorialRelatedProductIds(sanitizedEditorialRelated);
  };

  const toMediaAssets = (items: Awaited<ReturnType<typeof getMediaLibrary>>): MediaAsset[] =>
    items.map((item) => ({
      id: item.id,
      kind: "image" as const,
      name: item.name,
      url: item.dataUrl
    }));

  const refreshMediaLibrary = async () => {
    const items = await getMediaLibrary();
    setMediaAssets(toMediaAssets(items));
    return items.length;
  };

  useEffect(() => {
    let active = true;

    const bootstrapDraft = async () => {
      setIsBootstrapping(true);
      setRequestError(null);
      try {
        const [content, meta, apiSettings, inquiries] = await Promise.all([
          getFashionAdminInitialContentAsync(),
          getFashionMetaAsync(),
          getFashionWhatsAppApiSettingsAsync(),
          getFashionInquiriesAsync(30).catch(() => [])
        ]);
        if (!active) return;
        applyDraftState(content);
        setFashionMeta(meta);
        setWhatsAppApiSettings(apiSettings);
        setRecentInquiries(inquiries);
        void getMediaLibrary()
          .then((items) => {
            if (!active) return;
            setMediaAssets(toMediaAssets(items));
          })
          .catch(() => {
            if (!active) return;
            setMediaAssets([]);
          });
        if (meta?.updatedAt) {
          const formatted = formatAdminTime(new Date(meta.updatedAt));
          setSavedAt(meta.hasDraft ? formatted : null);
          setPublishedAt(meta.hasDraft ? null : formatted);
        } else {
          setSavedAt(null);
          setPublishedAt(null);
        }
      } catch (error) {
        if (!active) return;
        setRequestError(error instanceof Error ? error.message : "Failed to load fashion admin content.");
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrapDraft();

    return () => {
      active = false;
    };
  }, []);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId || selectedProductId === NEW_PRODUCT_ID) return null;
    return allProducts.find((product) => product.id === selectedProductId) ?? null;
  }, [allProducts, selectedProductId]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return allProducts;
    return allProducts.filter((product) =>
      [product.name, product.collection, product.category, product.badge ?? "", product.tone, ...product.styleTags]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [allProducts, productSearch]);

  const productFieldOptions = useMemo(() => {
    const uniqueSorted = (values: string[]) =>
      Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

    const catalogBundleIds = allProducts.flatMap((product) => product.bundleIds ?? []);
    const knownBundleIds = Object.keys(bundleAssignments);

    return {
      collections: uniqueSorted(allProducts.map((product) => product.collection)),
      categories: uniqueSorted(allProducts.map((product) => product.category)),
      materials: uniqueSorted(allProducts.map((product) => product.material)),
      fits: uniqueSorted(allProducts.map((product) => product.fit)),
      occasions: uniqueSorted(allProducts.map((product) => product.occasion)),
      availabilityLabels: uniqueSorted(allProducts.map((product) => product.availabilityLabel)),
      styleTags: uniqueSorted(allProducts.flatMap((product) => product.styleTags)),
      bundleIds: uniqueSorted([...catalogBundleIds, ...knownBundleIds])
    };
  }, [allProducts, bundleAssignments]);


  const selectedHomepageDefinition = useMemo(
    () => homepageBlockDefinitions.find((block) => block.id === selectedHomepageBlock) ?? homepageBlockDefinitions[0],
    [selectedHomepageBlock]
  );

  const selectedHomepageProducts = useMemo(
    () =>
      (homepageAssignments[selectedHomepageBlock] ?? [])
        .map((productId) => allProducts.find((product) => product.id === productId))
        .filter((product): product is FashionProduct => Boolean(product)),
    [homepageAssignments, selectedHomepageBlock]
  );

  const selectedHomepageSlide = useMemo(
    () => (selectedHomepageSlideId ? homepageSlides.find((slide) => slide.id === selectedHomepageSlideId) ?? null : null),
    [homepageSlides, selectedHomepageSlideId]
  );

  const selectedEditorialSlide = useMemo(
    () => (selectedEditorialSlideId ? editorialSlides.find((slide) => slide.id === selectedEditorialSlideId) ?? null : null),
    [editorialSlides, selectedEditorialSlideId]
  );
  const currentMediaSelectionUrl = useMemo(() => {
    if (mediaPickerSlot) {
      return productDraft[mediaPickerSlot] ?? "";
    }
    if (editorialMediaField) {
      return (draft.editorial[editorialMediaField] as string | undefined) ?? "";
    }
    if (styleNotesMediaField) {
      return (draft.styleNotes[styleNotesMediaField] as string | undefined) ?? "";
    }
    if (slideMediaTarget) {
      const slideList = slideMediaTarget.scope === "homepage" ? homepageSlides : editorialSlides;
      const targetSlide = slideList.find((slide) => slide.id === slideMediaTarget.slideId);
      return targetSlide?.imageUrl ?? "";
    }
    return "";
  }, [draft.editorial, draft.styleNotes, editorialMediaField, editorialSlides, homepageSlides, mediaPickerSlot, productDraft, slideMediaTarget, styleNotesMediaField]);
  const filteredMediaAssets = useMemo(() => {
    const imageAssets = mediaAssets.filter((asset) => asset.kind === "image");
    const query = mediaPickerQuery.trim().toLowerCase();
    if (!query) return imageAssets;
    return imageAssets.filter((asset) => asset.name.toLowerCase().includes(query));
  }, [mediaAssets, mediaPickerQuery]);

  const createSlideDraft = (prefix: string, count: number): FashionHeroSlide => ({
    id: `${prefix}-${count + 1}` ,
    eyebrow: "New Story",
    badge: "New",
    headline: "New campaign headline",
    subtext: "Add the supporting story copy for this slide before wiring it into the live client page.",
    primaryCta: "Open Collection",
    secondaryCta: "Open Story",
    primaryCtaHref: "/fashion/collections",
    secondaryCtaHref: "/fashion/editorial",
    palette: "bg-[linear-gradient(145deg,#efe2d5,#c8a07c_52%,#6e523c)] dark:bg-[linear-gradient(145deg,#231b16,#624934_52%,#c79c72)]",
    accent: "text-[#7a5e3e] dark:text-[#d5b18b]"
  });

  const addHomepageSlide = () => {
    setHomepageSlides((current) => {
      const next = [...current, createSlideDraft("hero", current.length)];
      setSelectedHomepageSlideId(next[next.length - 1]?.id ?? "");
      return next;
    });
  };

  const patchHomepageSlide = (slideId: string, patch: Partial<FashionHeroSlide>) => {
    setHomepageSlides((current) => current.map((slide) => (slide.id === slideId ? { ...slide, ...patch } : slide)));
  };

  const duplicateHomepageSlide = (slideId: string) => {
    setHomepageSlides((current) => {
      const index = current.findIndex((slide) => slide.id === slideId);
      if (index < 0) return current;
      const source = current[index];
      const duplicate = { ...source, id: `${source.id}-copy-${index + 1}` };
      const next = [...current];
      next.splice(index + 1, 0, duplicate);
      setSelectedHomepageSlideId(duplicate.id);
      return next;
    });
  };

  const deleteHomepageSlide = (slideId: string) => {
    setHomepageSlides((current) => {
      const next = current.filter((slide) => slide.id !== slideId);
      setSelectedHomepageSlideId(next[0]?.id ?? "");
      return next;
    });
  };

  const moveHomepageSlide = (slideId: string, direction: -1 | 1) => {
    setHomepageSlides((current) => {
      const next = [...current];
      const index = next.findIndex((slide) => slide.id === slideId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.length) return current;
      const swap = next[target];
      next[target] = next[index];
      next[index] = swap;
      return next;
    });
  };

  const addEditorialSlide = () => {
    setEditorialSlides((current) => {
      const next = [...current, createSlideDraft("editorial", current.length)];
      setSelectedEditorialSlideId(next[next.length - 1]?.id ?? "");
      return next;
    });
  };

  const patchEditorialSlide = (slideId: string, patch: Partial<FashionHeroSlide>) => {
    setEditorialSlides((current) => current.map((slide) => (slide.id === slideId ? { ...slide, ...patch } : slide)));
  };

  const duplicateEditorialSlide = (slideId: string) => {
    setEditorialSlides((current) => {
      const index = current.findIndex((slide) => slide.id === slideId);
      if (index < 0) return current;
      const source = current[index];
      const duplicate = { ...source, id: `${source.id}-copy-${index + 1}` };
      const next = [...current];
      next.splice(index + 1, 0, duplicate);
      setSelectedEditorialSlideId(duplicate.id);
      return next;
    });
  };

  const deleteEditorialSlide = (slideId: string) => {
    setEditorialSlides((current) => {
      const next = current.filter((slide) => slide.id !== slideId);
      setSelectedEditorialSlideId(next[0]?.id ?? "");
      return next;
    });
  };

  const moveEditorialSlide = (slideId: string, direction: -1 | 1) => {
    setEditorialSlides((current) => {
      const next = [...current];
      const index = next.findIndex((slide) => slide.id === slideId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.length) return current;
      const swap = next[target];
      next[target] = next[index];
      next[index] = swap;
      return next;
    });
  };

  useEffect(() => {
    if (selectedHomepageSlideId && !homepageSlides.some((slide) => slide.id === selectedHomepageSlideId)) {
      setSelectedHomepageSlideId(homepageSlides[0]?.id ?? "");
    }
  }, [homepageSlides, selectedHomepageSlideId]);

  useEffect(() => {
    if (selectedEditorialSlideId && !editorialSlides.some((slide) => slide.id === selectedEditorialSlideId)) {
      setSelectedEditorialSlideId(editorialSlides[0]?.id ?? "");
    }
  }, [editorialSlides, selectedEditorialSlideId]);

  const addProductToHomepageBlock = (blockId: HomepageBlockId, preferredProductId?: string) => {
    setHomepageAssignments((current) => {
      const existing = current[blockId] ?? [];
      if (preferredProductId) {
        if (existing.includes(preferredProductId)) {
          setRequestError("This product is already assigned to the selected homepage block.");
          return current;
        }
        if (draft.pricing.enforceUniquePerPage) {
          const usedElsewhere = Object.entries(current).some(([targetBlockId, ids]) => targetBlockId !== blockId && ids.includes(preferredProductId));
          if (usedElsewhere) {
            setRequestError("This product is already used in another homepage block.");
            return current;
          }
        }
        return { ...current, [blockId]: [...existing, preferredProductId] };
      }
      const nextProduct = allProducts.find((product) => !existing.includes(product.id));
      if (!nextProduct) return current;
      return { ...current, [blockId]: [...existing, nextProduct.id] };
    });
  };

  const removeProductFromHomepageBlock = (blockId: HomepageBlockId, productId: string) => {
    setHomepageAssignments((current) => ({
      ...current,
      [blockId]: (current[blockId] ?? []).filter((id) => id !== productId)
    }));
  };

  const moveHomepageProduct = (blockId: HomepageBlockId, productId: string, direction: -1 | 1) => {
    setHomepageAssignments((current) => {
      const items = [...(current[blockId] ?? [])];
      const index = items.indexOf(productId);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return current;
      const swap = items[nextIndex];
      items[nextIndex] = items[index];
      items[index] = swap;
      return { ...current, [blockId]: items };
    });
  };

  const editHomepageProduct = (productId: string) => {
    setSelectedProductId(productId);
    setActiveSection("product-library");
  };
  const collectionChipDefinitions = useMemo(() => {
    const staticChips = [
      { id: "all", label: "All", count: allProducts.length, kind: "system" as const },
      { id: "new", label: "New", count: allProducts.filter((product) => product.badgeType === "new").length, kind: "system" as const },
      { id: "trending", label: "Trending", count: allProducts.filter((product) => product.badgeType === "hot" || product.badgeType === "trending").length, kind: "system" as const },
      { id: "limited", label: "Limited", count: allProducts.filter((product) => product.badgeType === "limited").length, kind: "system" as const }
    ];

    const categoryMap = new Map<string, number>();
    allProducts.forEach((product) => {
      categoryMap.set(product.category, (categoryMap.get(product.category) ?? 0) + 1);
    });

    const dynamicChips = Array.from(categoryMap.entries()).map(([label, count]) => ({
      id: `category-${label.toLowerCase().replace(/\s+/g, "-")}`,
      label,
      count,
      kind: "category" as const
    }));

    return [...staticChips, ...dynamicChips, ...customCollectionChips];
  }, [customCollectionChips]);


  const editorialProducts = useMemo(
    () => editorialStoryProductIds.map((productId) => allProducts.find((product) => product.id === productId)).filter((product): product is FashionProduct => Boolean(product)),
    [editorialStoryProductIds]
  );
  const editorialChapterTwoProducts = useMemo(
    () => editorialChapterProductIds.map((productId) => allProducts.find((product) => product.id === productId)).filter((product): product is FashionProduct => Boolean(product)),
    [editorialChapterProductIds]
  );
  const editorialRelatedStoryProducts = useMemo(
    () => editorialRelatedProductIds.map((productId) => allProducts.find((product) => product.id === productId)).filter((product): product is FashionProduct => Boolean(product)),
    [editorialRelatedProductIds]
  );
  const selectedStyleSetProducts = useMemo(
    () => {
      const uniqueIds = dedupeIds(styleSetAssignments[draft.styleNotes.defaultSet] ?? []);
      return uniqueIds
        .map((productId) => allProducts.find((product) => product.id === productId))
        .filter((product): product is FashionProduct => Boolean(product));
    },
    [allProducts, draft.styleNotes.defaultSet, styleSetAssignments]
  );
  const productById = useMemo(() => new Map(allProducts.map((product) => [product.id, product])), [allProducts]);
  const homepageBlockById = useMemo(() => new Map(homepageBlockDefinitions.map((block) => [block.id, block])), []);
  const editorialPageIds = useMemo(
    () => new Set([...editorialStoryProductIds, ...editorialChapterProductIds, ...editorialRelatedProductIds]),
    [editorialChapterProductIds, editorialRelatedProductIds, editorialStoryProductIds]
  );
  const homepagePageIds = useMemo(() => new Set(Object.values(homepageAssignments).flat()), [homepageAssignments]);
  const productPickerContext = useMemo<ProductPickerContext | null>(() => {
    if (!productPickerTarget) return null;

    if (productPickerTarget.scope === "homepage") {
      const blockId = productPickerTarget.blockId;
      const sectionIds = homepageAssignments[blockId] ?? [];
      const previewProducts = sectionIds.map((id) => productById.get(id)).filter((product): product is FashionProduct => Boolean(product));
      const pageUsedIds = new Set(homepagePageIds);
      const blockMeta = homepageBlockById.get(blockId);
      return {
        title: `Homepage: ${blockMeta?.title ?? blockId}`,
        subtitle: "Pick products for this exact homepage block.",
        sectionLabel: `/fashion > ${blockMeta?.title ?? blockId}`,
        previewLabel: "Block preview",
        sectionIds,
        pageUsedIds,
        previewProducts
      };
    }

    if (productPickerTarget.scope === "style") {
      const sectionIds = styleSetAssignments[draft.styleNotes.defaultSet] ?? [];
      return {
        title: `Style Notes: ${draft.styleNotes.setMeta[draft.styleNotes.defaultSet].title}`,
        subtitle: "Add products to the active style set.",
        sectionLabel: `/fashion/style-notes > ${draft.styleNotes.defaultSet}`,
        previewLabel: "Set preview",
        sectionIds,
        pageUsedIds: new Set(sectionIds),
        previewProducts: sectionIds.map((id) => productById.get(id)).filter((product): product is FashionProduct => Boolean(product))
      };
    }

    if (productPickerTarget.scope === "spotlight") {
      const sectionIds = selectedCollectionSpotlightId ? [selectedCollectionSpotlightId] : [];
      return {
        title: "Collections spotlight",
        subtitle: "Choose the spotlight product shown first on the collections page.",
        sectionLabel: "/fashion/collections > spotlight",
        previewLabel: "Current spotlight",
        sectionIds,
        pageUsedIds: new Set(),
        previewProducts: sectionIds.map((id) => productById.get(id)).filter((product): product is FashionProduct => Boolean(product))
      };
    }

    if (productPickerTarget.scope === "editorial-story") {
      return {
        title: "Editorial: Story picks",
        subtitle: `Replace item #${productPickerTarget.index + 1} in story picks.`,
        sectionLabel: "/fashion/editorial > story picks",
        previewLabel: "Story picks preview",
        sectionIds: editorialStoryProductIds,
        pageUsedIds: editorialPageIds,
        replaceIndex: productPickerTarget.index,
        previewProducts: editorialProducts
      };
    }

    if (productPickerTarget.scope === "editorial-chapter") {
      return {
        title: "Editorial: Chapter products",
        subtitle: `Replace item #${productPickerTarget.index + 1} in chapter products.`,
        sectionLabel: "/fashion/editorial > chapter products",
        previewLabel: "Chapter preview",
        sectionIds: editorialChapterProductIds,
        pageUsedIds: editorialPageIds,
        replaceIndex: productPickerTarget.index,
        previewProducts: editorialChapterTwoProducts
      };
    }

    if (productPickerTarget.scope === "editorial-related") {
      return {
        title: "Editorial: Related strip",
        subtitle: `Replace item #${productPickerTarget.index + 1} in related strip.`,
        sectionLabel: "/fashion/editorial > related strip",
        previewLabel: "Related strip preview",
        sectionIds: editorialRelatedProductIds,
        pageUsedIds: editorialPageIds,
        replaceIndex: productPickerTarget.index,
        previewProducts: editorialRelatedStoryProducts
      };
    }

    if (productPickerTarget.scope === "bundle") {
      const sectionIds = bundleAssignments[selectedBundleId] ?? [];
      return {
        title: "Bundle assignment",
        subtitle: "Choose products for this complete-look bundle.",
        sectionLabel: `Bundle > ${selectedBundleId}`,
        previewLabel: "Bundle preview",
        sectionIds,
        pageUsedIds: new Set(sectionIds),
        previewProducts: sectionIds.map((id) => productById.get(id)).filter((product): product is FashionProduct => Boolean(product))
      };
    }

    return null;
  }, [
    bundleAssignments,
    draft.styleNotes.defaultSet,
    draft.styleNotes.setMeta,
    editorialChapterProductIds,
    editorialChapterTwoProducts,
    editorialPageIds,
    editorialProducts,
    editorialRelatedProductIds,
    editorialRelatedStoryProducts,
    editorialStoryProductIds,
    homepageAssignments,
    homepageBlockById,
    homepagePageIds,
    productById,
    productPickerTarget,
    selectedBundleId,
    selectedCollectionSpotlightId,
    styleSetAssignments
  ]);
  const filteredPickerProducts = useMemo(() => {
    const query = productPickerQuery.trim().toLowerCase();
    if (!query) return allProducts;
    return allProducts.filter((product) =>
      [product.name, product.collection, product.category, product.badge ?? "", product.tone, ...product.styleTags]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [allProducts, productPickerQuery]);

  const addStyleSetProduct = (preferredProductId?: string) => {
    const currentSet = draft.styleNotes.defaultSet;
    setStyleSetAssignments((current) => {
      const existing = current[currentSet] ?? [];
      if (preferredProductId && existing.includes(preferredProductId)) {
        setRequestError("This product is already in the active style set.");
        return current;
      }
      const nextProduct = (preferredProductId ? allProducts.find((product) => product.id === preferredProductId) : null) ?? allProducts.find((product) => !existing.includes(product.id));
      if (!nextProduct) return current;
      return { ...current, [currentSet]: [...existing, nextProduct.id] };
    });
  };

  const editStyleSetProduct = (productId: string) => {
    setSelectedProductId(productId);
    setActiveSection("product-library");
  };

  const duplicateStyleSetProduct = (index: number) => {
    const currentSet = draft.styleNotes.defaultSet;
    setStyleSetAssignments((current) => {
      const items = [...(current[currentSet] ?? [])];
      if (!items[index]) return current;
      const replacement = allProducts.find((product) => !items.includes(product.id));
      if (!replacement) return current;
      items.splice(index + 1, 0, replacement.id);
      return { ...current, [currentSet]: items };
    });
  };

  const removeStyleSetProduct = (index: number) => {
    const currentSet = draft.styleNotes.defaultSet;
    setStyleSetAssignments((current) => {
      const items = [...(current[currentSet] ?? [])];
      if (index < 0 || index >= items.length) return current;
      items.splice(index, 1);
      return { ...current, [currentSet]: items };
    });
  };

  const moveStyleSetProduct = (index: number, direction: -1 | 1) => {
    const currentSet = draft.styleNotes.defaultSet;
    setStyleSetAssignments((current) => {
      const items = [...(current[currentSet] ?? [])];
      const nextIndex = index + direction;
      if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return current;
      const swap = items[nextIndex];
      items[nextIndex] = items[index];
      items[index] = swap;
      return { ...current, [currentSet]: items };
    });
  };  const collectionSpotlightProduct = useMemo(() => {
    if (draft.collections.spotlightMode === "manual") {
      return allProducts.find((product) => product.id === selectedCollectionSpotlightId) ?? allProducts[0] ?? null;
    }
    const bySort = [...allProducts];
    switch (draft.collections.defaultSort) {
      case "newest":
        return bySort.find((product) => product.badgeType === "new") ?? bySort[0] ?? null;
      case "price-low":
        return bySort.sort((a, b) => a.price - b.price)[0] ?? null;
      case "price-high":
        return bySort.sort((a, b) => b.price - a.price)[0] ?? null;
      default:
        return bySort.find((product) => product.badgeType === "best-seller" || product.badgeType === "editor-pick") ?? bySort[0] ?? null;
    }
  }, [allProducts, draft.collections.defaultSort, draft.collections.spotlightMode, selectedCollectionSpotlightId]);
  const bundleMap = useMemo(
    () =>
      Object.entries(bundleAssignments)
        .map(
          ([bundleId, productIds]) =>
            [
              bundleId,
              productIds
                .map((productId) => allProducts.find((product) => product.id === productId))
                .filter((product): product is FashionProduct => Boolean(product))
            ] as [string, FashionProduct[]]
        )
        .filter(([, products]) => products.length > 0),
    [allProducts, bundleAssignments]
  );

  const addBundleProduct = (preferredProductId?: string) => {
    setBundleAssignments((current) => {
      const existing = current[selectedBundleId] ?? [];
      if (preferredProductId) {
        if (existing.includes(preferredProductId)) {
          setRequestError("This product is already in the selected bundle.");
          return current;
        }
        return { ...current, [selectedBundleId]: [...existing, preferredProductId] };
      }
      const nextProduct = allProducts.find((product) => !existing.includes(product.id));
      if (!nextProduct) return current;
      return { ...current, [selectedBundleId]: [...existing, nextProduct.id] };
    });
  };

  useEffect(() => {
    if (!bundleMap.some(([bundleId]) => bundleId === selectedBundleId)) {
      setSelectedBundleId(bundleMap[0]?.[0] ?? "featured-look");
    }
  }, [bundleMap, selectedBundleId]);

  useEffect(() => {
    setProductDraft(buildProductDraft(selectedProduct));
    setProductDraftSavedAt(null);
  }, [selectedProduct]);

  const patchProductDraft = (value: Partial<ProductDraftState>) => {
    setProductDraft((current) => ({ ...current, ...value }));
  };

  const resetProductDraft = () => {
    setProductDraft(buildProductDraft(selectedProduct));
    setProductDraftSavedAt(null);
  };

  const commitProductDraft = () => {
    const fallbackProduct = selectedProduct ?? allProducts[0] ?? null;
    const normalizedBadgeType = productDraft.badgeType.trim();
    const nextProduct: FashionProduct = {
      id: productDraft.id === NEW_PRODUCT_ID ? `fashion-${Date.now()}` : productDraft.id,
      name: productDraft.name || "Untitled product",
      collection: productDraft.collection || "General",
      category: productDraft.category || "General",
      price: Number(productDraft.price) || 0,
      badge: productDraft.badge.trim() || (normalizedBadgeType ? formatBadgeLabel(normalizedBadgeType) : undefined),
      badgeType: (normalizedBadgeType || undefined) as FashionProduct["badgeType"],
      tone: fallbackProduct?.tone ?? "Neutral",
      note: productDraft.note || "Add a stronger product note before publishing this item.",
      palette:
        fallbackProduct?.palette ??
        "bg-[linear-gradient(135deg,#efe2d5,#c8a07c_52%,#6e523c)] dark:bg-[linear-gradient(135deg,#231b16,#624934_52%,#c79c72)]",
      material: productDraft.material || "Not set",
      fit: productDraft.fit || "Not set",
      occasion: productDraft.occasion || "Not set",
      availabilityLabel: productDraft.availabilityLabel || "Available soon",
      styleTags: productDraft.styleTags.split(",").map((tag) => tag.trim()).filter(Boolean),
      ctaLabel: fallbackProduct?.ctaLabel,
      whatsappNote: fallbackProduct?.whatsappNote,
      whatsappNumber: productDraft.whatsappNumber.trim() || undefined,
      bundleIds: productDraft.bundleIds.split(",").map((bundleId) => bundleId.trim()).filter(Boolean),
      primaryImage: productDraft.primaryImage || undefined,
      detailImage: productDraft.detailImage || undefined,
      stylingImage: productDraft.stylingImage || undefined
    };
    const existingIndex = catalogProducts.findIndex((product) => product.id === nextProduct.id);
    const nextCatalogProducts =
      existingIndex < 0
        ? [...catalogProducts, nextProduct]
        : catalogProducts.map((product, index) => (index === existingIndex ? nextProduct : product));

    return { nextProduct, nextCatalogProducts };
  };

  const saveProductDraft = () => {
    const { nextProduct, nextCatalogProducts } = commitProductDraft();
    setCatalogProducts(nextCatalogProducts);
    setSelectedProductId(nextProduct.id);
    setProductDraftSavedAt(formatAdminTime());
    setSavedAt(formatAdminTime());
  };

  const startNewProductDraft = () => {
    setSelectedProductId(NEW_PRODUCT_ID);
    setProductDraft(buildProductDraft(null));
    setProductDraftSavedAt(null);
  };

  const addCustomCollectionChip = () => {
    setCustomCollectionChips((current) => [...current, { id: `custom-chip-${current.length + 1}`, label: `Custom ${current.length + 1}`, count: Math.max(1, Math.min(allProducts.length, draft.collections.initialVisibleCount)), kind: "custom" }]);
  };

  const removeCustomCollectionChip = (chipId: string) => {
    setCustomCollectionChips((current) => current.filter((chip) => chip.id !== chipId));
  };

  const chooseNextSpotlightProduct = () => {
    const currentIndex = allProducts.findIndex((product) => product.id === selectedCollectionSpotlightId);
    const next = allProducts[(currentIndex + 1 + allProducts.length) % allProducts.length];
    if (!next) return;
    setSelectedCollectionSpotlightId(next.id);
    patchDraft("collections", { spotlightMode: "manual" });
  };

  const moveEditorialListProduct = (setList: ((updater: (current: string[]) => string[]) => void), index: number, direction: -1 | 1) => {
    setList((items) => {
      const next = [...items];
      const target = index + direction;
      if (index < 0 || index >= next.length || target < 0 || target >= next.length) return items;
      const swap = next[target];
      next[target] = next[index];
      next[index] = swap;
      return next;
    });
  };

  const removeEditorialListProduct = (setList: ((updater: (current: string[]) => string[]) => void), index: number) => {
    setList((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const previewEditorialStoryCta = () => {
    if (editorialProducts.length === 0) {
      setRequestError("Add at least one story product before previewing the CTA.");
      return;
    }
    openFashionStoryWhatsApp(draft.editorial.storyTitle, editorialProducts, "Fashion boss editorial preview");
  };

  const getProductPickerStatus = (product: FashionProduct): { disabled: boolean; badges: string[]; helperText?: string } => {
    if (!productPickerContext) {
      return { disabled: false, badges: [] as string[] };
    }

    const badges: string[] = [];
    const sectionIds = productPickerContext.sectionIds;
    const inSection = sectionIds.includes(product.id);
    const replaceIndex = productPickerContext.replaceIndex;
    const currentSlotId = typeof replaceIndex === "number" ? sectionIds[replaceIndex] ?? null : null;

    let usedOutsideSection = false;
    if (productPickerTarget?.scope === "homepage") {
      const selectedBlockIds = homepageAssignments[productPickerTarget.blockId] ?? [];
      usedOutsideSection = Object.entries(homepageAssignments).some(
        ([blockId, ids]) => blockId !== productPickerTarget.blockId && ids.includes(product.id)
      );
      if (selectedBlockIds.includes(product.id)) {
        badges.push("Already in this block");
      }
    } else if (productPickerTarget?.scope === "editorial-story") {
      usedOutsideSection = [...editorialChapterProductIds, ...editorialRelatedProductIds].includes(product.id);
    } else if (productPickerTarget?.scope === "editorial-chapter") {
      usedOutsideSection = [...editorialStoryProductIds, ...editorialRelatedProductIds].includes(product.id);
    } else if (productPickerTarget?.scope === "editorial-related") {
      usedOutsideSection = [...editorialStoryProductIds, ...editorialChapterProductIds].includes(product.id);
    } else {
      usedOutsideSection = productPickerContext.pageUsedIds.has(product.id) && !inSection;
    }

    if (inSection && currentSlotId !== product.id && productPickerTarget?.scope !== "homepage") {
      badges.push("Already in this section");
    }
    if (currentSlotId === product.id) {
      badges.push("Current slot");
    }
    if (draft.pricing.enforceUniquePerPage && usedOutsideSection) {
      badges.push("Already used on this page");
    }

    const duplicatedInSection = inSection && currentSlotId !== product.id;
    const violatesPageUnique = draft.pricing.enforceUniquePerPage && usedOutsideSection && currentSlotId !== product.id;
    const disabled = Boolean(duplicatedInSection || violatesPageUnique);

    return {
      disabled,
      badges,
      helperText: disabled
        ? duplicatedInSection
          ? "Choose a different product to avoid repeated cards in this section."
          : "This product is already used elsewhere on the same page."
        : undefined
    };
  };

  const applyPickedProduct = (product: FashionProduct) => {
    if (!productPickerTarget) return;

    switch (productPickerTarget.scope) {
      case "homepage":
        addProductToHomepageBlock(productPickerTarget.blockId, product.id);
        break;
      case "spotlight":
        setSelectedCollectionSpotlightId(product.id);
        patchDraft("collections", { spotlightMode: "manual" });
        break;
      case "style":
        addStyleSetProduct(product.id);
        break;
      case "bundle":
        addBundleProduct(product.id);
        break;
      case "editorial-chapter":
        setEditorialChapterProductIds((items) => {
          if (items.some((itemId, itemIndex) => itemIndex !== productPickerTarget.index && itemId === product.id)) {
            setRequestError("This product is already in Chapter products.");
            return items;
          }
          return items.map((itemId, itemIndex) => (itemIndex === productPickerTarget.index ? product.id : itemId));
        });
        break;
      case "editorial-story":
        setEditorialStoryProductIds((items) => {
          if (items.some((itemId, itemIndex) => itemIndex !== productPickerTarget.index && itemId === product.id)) {
            setRequestError("This product is already in Story picks.");
            return items;
          }
          return items.map((itemId, itemIndex) => (itemIndex === productPickerTarget.index ? product.id : itemId));
        });
        break;
      case "editorial-related":
        setEditorialRelatedProductIds((items) => {
          if (items.some((itemId, itemIndex) => itemIndex !== productPickerTarget.index && itemId === product.id)) {
            setRequestError("This product is already in Related story strip.");
            return items;
          }
          return items.map((itemId, itemIndex) => (itemIndex === productPickerTarget.index ? product.id : itemId));
        });
        break;
    }

    setProductPickerTarget(null);
  };

  const applyPickedMedia = (imageUrl: string) => {
    if (mediaPickerSlot) {
      patchProductDraft({ [mediaPickerSlot]: imageUrl } as Partial<ProductDraftState>);
      closeMediaPicker();
      return;
    }
    if (editorialMediaField) {
      patchDraft("editorial", { [editorialMediaField]: imageUrl } as Partial<FashionBossDraft["editorial"]>);
      closeMediaPicker();
      return;
    }
    if (styleNotesMediaField) {
      patchDraft("styleNotes", { [styleNotesMediaField]: imageUrl } as Partial<FashionBossDraft["styleNotes"]>);
      closeMediaPicker();
      return;
    }
    if (slideMediaTarget) {
      if (slideMediaTarget.scope === "homepage") {
        patchHomepageSlide(slideMediaTarget.slideId, { imageUrl });
      } else {
        patchEditorialSlide(slideMediaTarget.slideId, { imageUrl });
      }
      closeMediaPicker();
    }
  };
  const closeMediaPicker = () => {
    setMediaPickerSlot(null);
    setEditorialMediaField(null);
    setStyleNotesMediaField(null);
    setSlideMediaTarget(null);
    setMediaPickerQuery("");
  };
  const clearPickedMediaTarget = () => {
    if (mediaPickerSlot) {
      patchProductDraft({ [mediaPickerSlot]: "" } as Partial<ProductDraftState>);
      closeMediaPicker();
      return;
    }
    if (editorialMediaField) {
      patchDraft("editorial", { [editorialMediaField]: "" } as Partial<FashionBossDraft["editorial"]>);
      closeMediaPicker();
      return;
    }
    if (styleNotesMediaField) {
      patchDraft("styleNotes", { [styleNotesMediaField]: "" } as Partial<FashionBossDraft["styleNotes"]>);
      closeMediaPicker();
      return;
    }
    if (slideMediaTarget) {
      if (slideMediaTarget.scope === "homepage") {
        patchHomepageSlide(slideMediaTarget.slideId, { imageUrl: undefined });
      } else {
        patchEditorialSlide(slideMediaTarget.slideId, { imageUrl: undefined });
      }
      closeMediaPicker();
    }
  };

  const handleMediaUpload = async (kind: "image" | "video", event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    event.target.value = "";
    setMediaStatusMessage(null);
    if (kind !== "image") {
      setRequestError("Video upload is not connected yet. Use image upload for now.");
      return;
    }
    setIsUploadingMedia(true);
    setRequestError(null);
    try {
      const uploaded = await uploadMediaFiles(files);
      await refreshMediaLibrary();
      setMediaStatusMessage(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded successfully.`);
      setActionMessage(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded.`);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to upload media.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const removeMediaAsset = async (assetId: string) => {
    setRequestError(null);
    setMediaStatusMessage(null);
    try {
      await deleteMediaItem(assetId);
      await refreshMediaLibrary();
      setMediaStatusMessage("Media item removed.");
      setActionMessage("Media item deleted.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to delete media.");
    }
  };

  const applyUploadsToEmptyHomepageSlides = () => {
    const imageUrls = mediaAssets.filter((asset) => asset.kind === "image").map((asset) => asset.url);
    if (imageUrls.length === 0) {
      setRequestError("No uploaded images available to apply.");
      return;
    }
    setHomepageSlides((current) => {
      let imageIndex = 0;
      const next = current.map((slide) => {
        if (slide.imageUrl?.trim()) return slide;
        const nextImage = imageUrls[imageIndex];
        if (!nextImage) return slide;
        imageIndex += 1;
        return { ...slide, imageUrl: nextImage };
      });
      return next;
    });
    setMediaStatusMessage("Applied uploaded images to empty homepage slides. Save and publish to reflect on client pages.");
    setActionMessage("Homepage slides updated from media library.");
  };

  const applyUploadsToEmptyEditorialSlides = () => {
    const imageUrls = mediaAssets.filter((asset) => asset.kind === "image").map((asset) => asset.url);
    if (imageUrls.length === 0) {
      setRequestError("No uploaded images available to apply.");
      return;
    }
    setEditorialSlides((current) => {
      let imageIndex = 0;
      const next = current.map((slide) => {
        if (slide.imageUrl?.trim()) return slide;
        const nextImage = imageUrls[imageIndex];
        if (!nextImage) return slide;
        imageIndex += 1;
        return { ...slide, imageUrl: nextImage };
      });
      return next;
    });
    setMediaStatusMessage("Applied uploaded images to empty editorial slides. Save and publish to reflect on client pages.");
    setActionMessage("Editorial slides updated from media library.");
  };

  const featuredCounts = useMemo(
    () => ({
      products: allProducts.length,
      stories: homepageSlides.length,
      trustPoints: fashionTrustPoints.length,
      bundles: bundleMap.length
    }),
    [allProducts.length, bundleMap.length, homepageSlides.length]
  );
  const publishSectionRows = useMemo(
    () => [
      { key: "home", cells: ["/fashion", String(homepageSlides.length), String(Object.values(homepageAssignments).reduce((sum, ids) => sum + ids.length, 0))] },
      { key: "collections", cells: ["/fashion/collections", String(collectionChipDefinitions.length), String(allProducts.length)] },
      { key: "editorial", cells: ["/fashion/editorial", String(editorialSlides.length), String(editorialStoryProductIds.length + editorialChapterProductIds.length + editorialRelatedProductIds.length)] },
      { key: "style-notes", cells: ["/fashion/style-notes", String(Object.values(styleSetAssignments).reduce((sum, ids) => sum + ids.length, 0)), String(Object.keys(draft.styleNotes.setMeta).length)] },
      { key: "catalog", cells: ["Product Library", String(allProducts.length), `${draft.pricing.currency} - ${draft.pricing.locale ?? "en-US"}`] },
      { key: "media", cells: ["Media Library", String(mediaAssets.length), `${mediaAssets.filter((asset) => asset.kind === "image").length} images`] },
      { key: "cta", cells: ["WhatsApp/CTA", "4 templates", whatsAppApiSettings.enabled ? "API enabled" : "wa.me fallback"] }
    ],
    [
      allProducts.length,
      collectionChipDefinitions.length,
      draft.pricing.currency,
      draft.pricing.locale,
      draft.styleNotes.setMeta,
      editorialChapterProductIds.length,
      editorialRelatedProductIds.length,
      editorialSlides.length,
      editorialStoryProductIds.length,
      homepageAssignments,
      homepageSlides.length,
      mediaAssets,
      styleSetAssignments,
      whatsAppApiSettings.enabled
    ]
  );
  const workspaceCounts: Array<[string, number]> = [
    ["Products", featuredCounts.products],
    ["Story slides", featuredCounts.stories],
    ["Trust points", featuredCounts.trustPoints],
    ["Bundles", featuredCounts.bundles]
  ];
  const previewLinks: Array<[string, string]> = [
    ["Preview New Arrivals", "/fashion"],
    ["Preview Editorial", "/fashion/editorial"],
    ["Preview Collections", "/fashion/collections"],
    ["Preview Style Notes", "/fashion/style-notes"]
  ];

  const patchDraft = <K extends "homepage" | "collections" | "editorial" | "styleNotes" | "pricing" | "whatsapp">(
    section: K,
    value: Partial<FashionBossDraft[K]>
  ) => {
    setDraft((current) => ({ ...current, [section]: { ...current[section], ...value } }));
  };

  const updateTrustPoint = (index: number, value: string) => {
    setDraft((current) => ({
      ...current,
      trustPoints: current.trustPoints.map((point, pointIndex) => (pointIndex === index ? value : point))
    }));
  };

  const addTrustPoint = () => {
    setDraft((current) => ({
      ...current,
      trustPoints: [...current.trustPoints, "New trust point"]
    }));
  };

  const removeTrustPoint = (index: number) => {
    setDraft((current) => ({
      ...current,
      trustPoints: current.trustPoints.filter((_, pointIndex) => pointIndex !== index)
    }));
  };

  const renameCustomCollectionChip = (chipId: string, label: string) => {
    setCustomCollectionChips((current) =>
      current.map((chip) => (chip.id === chipId ? { ...chip, label } : chip))
    );
  };

  const patchStyleSetMeta = (
    key: FashionBossDraft["styleNotes"]["defaultSet"],
    value: Partial<FashionBossDraft["styleNotes"]["setMeta"]["office"]>
  ) => {
    setDraft((current) => ({
      ...current,
      styleNotes: {
        ...current.styleNotes,
        setMeta: {
          ...current.styleNotes.setMeta,
          [key]: { ...current.styleNotes.setMeta[key], ...value }
        }
      }
    }));
  };

  const patchStyleIntroNote = (index: number, value: string) => {
    setDraft((current) => ({
      ...current,
      styleNotes: {
        ...current.styleNotes,
        introNotes: current.styleNotes.introNotes.map((note, noteIndex) => (noteIndex === index ? value : note))
      }
    }));
  };

  const buildPersistedDraft = (overrides?: { productCatalog?: FashionProduct[] }): FashionBossDraft => ({
    ...draft,
    productCatalog: overrides?.productCatalog ?? allProducts,
    homepageSlides,
    editorialSlides,
    collectionFilters: [
      ...draft.collectionFilters.filter((filter) => filter.kind !== "custom"),
      ...customCollectionChips.map(({ id, label, kind }) => ({ id, label, kind }))
    ],
    collectionSpotlightProductId: selectedCollectionSpotlightId,
    styleSetAssignments: dedupeRecordIds(styleSetAssignments as Record<string, string[]>) as FashionBossDraft["styleSetAssignments"],
    editorialStoryProductIds: dedupeIds(editorialStoryProductIds),
    editorialChapterProductIds: dedupeIds(editorialChapterProductIds),
    editorialRelatedProductIds: dedupeIds(editorialRelatedProductIds),
    bundleAssignments: dedupeRecordIds(bundleAssignments),
    homepageAssignments: dedupeRecordIds(homepageAssignments)
  });

  const saveCurrentProductToRemote = async (mode: "save" | "publish") => {
    const { nextProduct, nextCatalogProducts } = commitProductDraft();
    const timestamp = formatAdminTime();
    setCatalogProducts(nextCatalogProducts);
    setSelectedProductId(nextProduct.id);
    setProductDraftSavedAt(timestamp);
    setSavedAt(timestamp);
    const next = buildPersistedDraft({ productCatalog: nextCatalogProducts });
    setDraft(next);
    setRequestError(null);

    if (mode === "publish") {
      setIsPublishingRemote(true);
      try {
        const published = await publishFashionContent(next);
        applyDraftState(published);
        setFashionMeta(await getFashionMetaAsync());
        const now = formatAdminTime();
        setPublishedAt(now);
        setSavedAt(now);
        setActionMessage("Product saved and published.");
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : "Failed to publish fashion content.");
      } finally {
        setIsPublishingRemote(false);
      }
      return;
    }

    setIsSavingRemote(true);
    try {
      const saved = await saveFashionDraftContent(next);
      applyDraftState(saved);
      setFashionMeta(await getFashionMetaAsync());
      setSavedAt(formatAdminTime());
      setActionMessage("Product saved to draft.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to save fashion draft.");
    } finally {
      setIsSavingRemote(false);
    }
  };

  const saveDraft = async () => {
    const next = buildPersistedDraft();
    setDraft(next);
    setRequestError(null);
    setIsSavingRemote(true);
    try {
      const saved = await saveFashionDraftContent(next);
      applyDraftState(saved);
      setFashionMeta(await getFashionMetaAsync());
      setSavedAt(formatAdminTime());
      setActionMessage("Draft saved.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to save fashion draft.");
    } finally {
      setIsSavingRemote(false);
    }
  };

  const publishDraft = async () => {
    const next = buildPersistedDraft();
    setDraft(next);
    setRequestError(null);
    setIsPublishingRemote(true);
    try {
      const published = await publishFashionContent(next);
      applyDraftState(published);
      setFashionMeta(await getFashionMetaAsync());
      const now = formatAdminTime();
      setPublishedAt(now);
      setSavedAt(now);
      setActionMessage("Changes published.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to publish fashion content.");
    } finally {
      setIsPublishingRemote(false);
    }
  };

  const resetDraft = async () => {
    setRequestError(null);
    setIsResettingRemote(true);
    try {
      const next = await resetFashionContentToDefaults();
      applyDraftState(next);
      setFashionMeta(await getFashionMetaAsync());
      setSavedAt(null);
      setPublishedAt(formatAdminTime());
      setActionMessage("Fashion content reset.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to reset fashion content.");
    } finally {
      setIsResettingRemote(false);
    }
  };

  const saveWhatsAppApiSettings = async () => {
    setRequestError(null);
    setIsSavingWhatsAppApi(true);
    try {
      const next = await saveFashionWhatsAppApiSettingsAsync(whatsAppApiSettings);
      setWhatsAppApiSettings(next);
      setActionMessage("WhatsApp settings saved.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to save WhatsApp API settings.");
    } finally {
      setIsSavingWhatsAppApi(false);
    }
  };

  const updateInquiry = async (id: string, patch: FashionInquiryAdminUpdatePayload) => {
    setRequestError(null);
    setIsMutatingInquiry(true);
    try {
      const updated = await updateFashionInquiryAsync(id, patch);
      setRecentInquiries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setActionMessage("Inquiry updated.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to update inquiry.");
    } finally {
      setIsMutatingInquiry(false);
    }
  };

  const deleteInquiry = async (id: string) => {
    setRequestError(null);
    setIsMutatingInquiry(true);
    try {
      await deleteFashionInquiryAsync(id);
      setRecentInquiries((current) => current.filter((item) => item.id !== id));
      setActionMessage("Inquiry deleted.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to delete inquiry.");
    } finally {
      setIsMutatingInquiry(false);
    }
  };

  const renderSectionActionBar = (sectionLabel: string) => (
    <FashionAdminSectionHeader
      className="sticky top-[4.75rem] z-10 p-4 md:top-[5.25rem]"
      label={sectionLabel}
      title="Workspace actions"
      description="Save draft changes here without scrolling back to the top."
      actions={
        <>
          <FashionAdminChip tone="success">Draft-safe</FashionAdminChip>
          <FashionAdminChip tone="warning">Live publish</FashionAdminChip>
          <FashionAdminButton
            onClick={() => {
              void saveDraft();
            }}
            disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}
          >
            {isSavingRemote ? "Saving..." : "Save Draft"}
          </FashionAdminButton>
          <FashionAdminButton
            variant="primary"
            onClick={() => {
              void publishDraft();
            }}
            disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}
          >
            {isPublishingRemote ? "Publishing..." : "Publish"}
          </FashionAdminButton>
        </>
      }
    />
  );

  const renderEditorOverlay = ({
    title,
    description,
    onClose,
    onSaveDraft,
    onSaveAndPublish,
    children,
    widthClass = "max-w-4xl"
  }: {
    title: string;
    description: string;
    onClose: () => void;
    onSaveDraft: () => void;
    onSaveAndPublish: () => void;
    children: ReactNode;
    widthClass?: string;
  }) => (
    <>
      <button
        type="button"
        aria-label="Close editor"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-50 grid place-items-center px-4 py-5">
        <div className={`mx-auto flex max-h-[calc(100dvh-1.25rem)] w-full ${widthClass} flex-col overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_120px_-50px_rgba(0,0,0,0.65)] dark:border-white/10 dark:bg-[#120e0a] md:max-h-[calc(100vh-2.5rem)]`}>
          <div className="flex items-start justify-between gap-4 border-b border-black/8 px-4 py-4 dark:border-white/10 md:px-5">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">{title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            <button type="button" onClick={onClose} className="fa-btn fa-btn-ghost rounded-full px-3 py-1.5 text-xs">
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">{children}</div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/8 px-4 py-4 dark:border-white/10 md:px-5">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}
              className="fa-btn fa-btn-ghost rounded-2xl px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingRemote ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={onSaveAndPublish}
              disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}
              className="fa-btn fa-btn-primary rounded-2xl px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPublishingRemote ? "Publishing..." : "Save & Publish"}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <FashionAdminShell
        eventThemeVars={eventThemeVars}
        topbar={
          <FashionAdminTopbar
            eyebrow="Fashion"
            title="Admin"
            subtitle={requestError ?? undefined}
            status={
              <>
                <FashionAdminChip tone={fashionMeta?.hasDraft ? "warning" : "success"}>
                  {fashionMeta?.hasDraft ? "Unpublished changes" : "Published aligned"}
                </FashionAdminChip>
                {fashionMeta?.publishedRevision ? <FashionAdminChip>Rev {fashionMeta.publishedRevision}</FashionAdminChip> : null}
                {typeof fashionMeta?.publishedProductCount === "number" ? (
                  <FashionAdminChip>{fashionMeta.publishedProductCount} live products</FashionAdminChip>
                ) : null}
                {typeof fashionMeta?.homepageSlideCount === "number" ? <FashionAdminChip>{fashionMeta.homepageSlideCount} hero slides</FashionAdminChip> : null}
                <FashionAdminChip tone="success">
                  {isBootstrapping
                    ? "Loading"
                    : isPublishingRemote
                      ? "Publishing..."
                      : isSavingRemote
                        ? "Saving..."
                        : isResettingRemote
                          ? "Resetting..."
                          : publishedAt
                            ? `Published ${publishedAt}`
                            : savedAt
                              ? `Draft saved ${savedAt}`
                              : "Draft only"}
                </FashionAdminChip>
              </>
            }
            actions={
              <>
                <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} />
                <FashionAdminButton
                  onClick={() => {
                    void saveDraft();
                  }}
                  disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}
                >
                  {isSavingRemote ? "Saving..." : "Save Draft"}
                </FashionAdminButton>
                <FashionAdminButton
                  variant="primary"
                  onClick={() => {
                    void publishDraft();
                  }}
                  disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}
                >
                  {isPublishingRemote ? "Publishing..." : "Publish"}
                </FashionAdminButton>
                <FashionAdminButton
                  className="border-[var(--fa-error-border)] text-[var(--fa-error-text)] hover:bg-[var(--fa-error-bg)]"
                  onClick={() => {
                    void resetDraft();
                  }}
                  disabled={isBootstrapping || isSavingRemote || isPublishingRemote || isResettingRemote}
                >
                  {isResettingRemote ? "Resetting..." : "Reset"}
                </FashionAdminButton>
              </>
            }
          />
        }
        sidebar={
          <FashionAdminSidebar
            activeItem={activeSection}
            groups={sectionGroups.map((group) => ({
              title: group.title,
              items: group.items.map((section) => ({
                id: section.id,
                label: section.label,
                note: section.note,
                rightMeta: section.route ? <FashionAdminChip>Live page</FashionAdminChip> : undefined
              }))
            }))}
            onSelect={(id) => setActiveSection(id as BossSection)}
          />
        }
      >
          {requestError ? (
            <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
              {requestError}
            </div>
          ) : null}
          {!requestError && actionMessage ? (
            <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              {actionMessage}
            </div>
          ) : null}
          {activeSection === "dashboard" && (
            <DashboardWorkspace sectionCard={sectionCard} workspaceCounts={workspaceCounts} previewLinks={previewLinks} />
          )}

          {activeSection !== "dashboard" && (
            <section className={sectionCard}>
              <FashionAdminSectionHeader
                className="mb-6 p-4"
                label={sectionGroups.flatMap((group) => group.items).find((item) => item.id === activeSection)?.label ?? "Workspace"}
                title="Fashion-only controls"
                actions={savedAt ? <FashionAdminChip>Last saved {savedAt}</FashionAdminChip> : undefined}
              />

              {activeSection === "homepage-studio" && (
                <HomepageStudioWorkspace
                  renderSectionActionBar={renderSectionActionBar}
                  homepageBlockDefinitions={homepageBlockDefinitions}
                  homepageAssignments={homepageAssignments}
                  selectedHomepageBlock={selectedHomepageBlock}
                  setSelectedHomepageBlock={setSelectedHomepageBlock}
                  selectedHomepageDefinition={selectedHomepageDefinition}
                  patchDraft={patchDraft}
                  draft={draft}
                  setProductPickerTarget={setProductPickerTarget}
                  selectedHomepageSlide={selectedHomepageSlide}
                  selectedHomepageSlideId={selectedHomepageSlideId}
                  setSelectedHomepageSlideId={setSelectedHomepageSlideId}
                  patchHomepageSlide={patchHomepageSlide}
                  setSlideMediaTarget={setSlideMediaTarget}
                  addHomepageSlide={addHomepageSlide}
                  homepageSlides={homepageSlides}
                  duplicateHomepageSlide={duplicateHomepageSlide}
                  deleteHomepageSlide={deleteHomepageSlide}
                  moveHomepageSlide={moveHomepageSlide}
                  renderEditorOverlay={renderEditorOverlay}
                  saveDraft={saveDraft}
                  publishDraft={publishDraft}
                  slideBadgeOptions={slideBadgeOptions}
                  updateTrustPoint={updateTrustPoint}
                  addTrustPoint={addTrustPoint}
                  removeTrustPoint={removeTrustPoint}
                  selectedHomepageProducts={selectedHomepageProducts}
                  editHomepageProduct={editHomepageProduct}
                  removeProductFromHomepageBlock={removeProductFromHomepageBlock}
                  moveHomepageProduct={moveHomepageProduct}
                />
              )}

              {activeSection === "complex-studio" && (
                <ComplexStudioWorkspace
                  renderSectionActionBar={renderSectionActionBar}
                  homepageBlocks={homepageBlockDefinitions.map((block) => ({ id: block.id, title: block.title }))}
                  selectedHomepageBlock={selectedHomepageBlock}
                  setSelectedHomepageBlock={setSelectedHomepageBlock}
                  draft={draft}
                  patchDraft={patchDraft}
                  editorialCounts={{
                    story: editorialStoryProductIds.length,
                    chapter: editorialChapterProductIds.length,
                    related: editorialRelatedProductIds.length
                  }}
                  onOpenHomepageAssignment={(blockId) => setProductPickerTarget({ scope: "homepage", blockId })}
                  onOpenStyleAssignment={() => setProductPickerTarget({ scope: "style" })}
                  onOpenEditorialAssignment={(scope, index) => setProductPickerTarget({ scope, index })}
                  onOpenCollectionsSpotlight={() => setProductPickerTarget({ scope: "spotlight" })}
                />
              )}

              {activeSection === "collections-studio" && (
                <CollectionsStudioWorkspace
                  renderSectionActionBar={renderSectionActionBar}
                  selectedCollectionPanel={selectedCollectionPanel}
                  setSelectedCollectionPanel={setSelectedCollectionPanel}
                  draft={draft}
                  patchDraft={patchDraft}
                  addCustomCollectionChip={addCustomCollectionChip}
                  removeCustomCollectionChip={removeCustomCollectionChip}
                  chooseNextSpotlightProduct={chooseNextSpotlightProduct}
                  setProductPickerTarget={setProductPickerTarget}
                  collectionChipDefinitions={collectionChipDefinitions}
                  renameCustomCollectionChip={renameCustomCollectionChip}
                  collectionSpotlightProduct={collectionSpotlightProduct}
                />
              )}

              {activeSection === "editorial-studio" && (
                <EditorialStudioWorkspace
                  renderSectionActionBar={renderSectionActionBar}
                  selectedEditorialPanel={selectedEditorialPanel}
                  setSelectedEditorialPanel={setSelectedEditorialPanel}
                  editorialSlides={editorialSlides}
                  selectedEditorialSlide={selectedEditorialSlide}
                  selectedEditorialSlideId={selectedEditorialSlideId}
                  setSelectedEditorialSlideId={setSelectedEditorialSlideId}
                  addEditorialSlide={addEditorialSlide}
                  patchEditorialSlide={patchEditorialSlide}
                  setSlideMediaTarget={setSlideMediaTarget}
                  draft={draft}
                  patchDraft={patchDraft}
                  setProductPickerTarget={setProductPickerTarget}
                  moveEditorialListProduct={moveEditorialListProduct}
                  removeEditorialListProduct={removeEditorialListProduct}
                  previewEditorialStoryCta={previewEditorialStoryCta}
                  setEditorialStoryProductIds={setEditorialStoryProductIds}
                  setEditorialChapterProductIds={setEditorialChapterProductIds}
                  setEditorialRelatedProductIds={setEditorialRelatedProductIds}
                  editorialChapterTwoProducts={editorialChapterTwoProducts}
                  editorialProducts={editorialProducts}
                  editorialRelatedStoryProducts={editorialRelatedStoryProducts}
                  duplicateEditorialSlide={duplicateEditorialSlide}
                  deleteEditorialSlide={deleteEditorialSlide}
                  moveEditorialSlide={moveEditorialSlide}
                  renderEditorOverlay={renderEditorOverlay}
                  saveDraft={saveDraft}
                  publishDraft={publishDraft}
                  slideBadgeOptions={slideBadgeOptions}
                  editorialMediaFieldLabels={editorialMediaFieldLabels}
                  setEditorialMediaField={setEditorialMediaField}
                />
              )}

              {activeSection === "style-notes-studio" && (
                <StyleNotesStudioWorkspace
                  renderSectionActionBar={renderSectionActionBar}
                  draft={draft}
                  patchDraft={patchDraft}
                  patchStyleIntroNote={patchStyleIntroNote}
                  patchStyleSetMeta={patchStyleSetMeta}
                  removeStyleSetProduct={removeStyleSetProduct}
                  moveStyleSetProduct={moveStyleSetProduct}
                  setProductPickerTarget={setProductPickerTarget}
                  selectedStyleSetProducts={selectedStyleSetProducts}
                  editStyleSetProduct={editStyleSetProduct}
                  duplicateStyleSetProduct={duplicateStyleSetProduct}
                  setStyleNotesMediaField={setStyleNotesMediaField}
                />
              )}

              {activeSection === "product-library" && (
                <ProductLibraryWorkspace
                  renderSectionActionBar={renderSectionActionBar}
                  productSearch={productSearch}
                  setProductSearch={setProductSearch}
                  allProducts={allProducts}
                  selectedProductId={selectedProductId}
                  setSelectedProductId={setSelectedProductId}
                  startNewProductDraft={startNewProductDraft}
                  productDraft={productDraft}
                  patchProductDraft={patchProductDraft}
                  draft={draft}
                  patchDraft={patchDraft}
                  saveProductDraft={saveProductDraft}
                  resetProductDraft={resetProductDraft}
                  productDraftSavedAt={productDraftSavedAt}
                  setMediaPickerSlot={setMediaPickerSlot}
                  selectedProduct={selectedProduct}
                  filteredProducts={filteredProducts}
                  NEW_PRODUCT_ID={NEW_PRODUCT_ID}
                  renderEditorOverlay={renderEditorOverlay}
                  saveCurrentProductToRemote={saveCurrentProductToRemote}
                  formatBadgeLabel={formatBadgeLabel}
                  productBadgeOptions={productBadgeOptions}
                  productFieldOptions={productFieldOptions}
                />
              )}

              {activeSection === "publish-center" && (
                <PublishCenterWorkspace
                  workspaceCounts={workspaceCounts}
                  saveDraft={saveDraft}
                  publishDraft={publishDraft}
                  resetDraft={resetDraft}
                  isBootstrapping={isBootstrapping}
                  isSavingRemote={isSavingRemote}
                  isPublishingRemote={isPublishingRemote}
                  isResettingRemote={isResettingRemote}
                  fashionMeta={fashionMeta}
                  publishSectionRows={publishSectionRows}
                  previewLinks={previewLinks}
                  selectedProduct={selectedProduct}
                  draft={draft}
                  whatsAppApiSettings={whatsAppApiSettings}
                  publishedAt={publishedAt}
                  savedAt={savedAt}
                  selectedHomepageSlide={selectedHomepageSlide}
                  selectedEditorialSlide={selectedEditorialSlide}
                  selectedProductId={selectedProductId}
                  patchHomepageSlide={patchHomepageSlide}
                  patchEditorialSlide={patchEditorialSlide}
                  patchProductDraft={patchProductDraft}
                  productDraft={productDraft}
                />
              )}
              {activeSection === "media-library" && (
                <MediaLibraryWorkspace
                  renderSectionActionBar={renderSectionActionBar}
                  imageUploadInputRef={imageUploadInputRef}
                  handleMediaUpload={handleMediaUpload}
                  mediaAssets={mediaAssets}
                  removeMediaAsset={removeMediaAsset}
                  isUploadingMedia={isUploadingMedia}
                  mediaStatusMessage={mediaStatusMessage}
                  mediaErrorMessage={requestError}
                  applyUploadsToEmptyHomepageSlides={applyUploadsToEmptyHomepageSlides}
                  applyUploadsToEmptyEditorialSlides={applyUploadsToEmptyEditorialSlides}
                />
              )}

              {activeSection === "whatsapp-settings" && (
                <WhatsAppSettingsWorkspace
                  renderSectionActionBar={renderSectionActionBar}
                  draft={draft}
                  selectedWhatsAppPanel={selectedWhatsAppPanel}
                  setSelectedWhatsAppPanel={setSelectedWhatsAppPanel}
                  patchDraft={patchDraft}
                  whatsAppApiSettings={whatsAppApiSettings}
                  setWhatsAppApiSettings={setWhatsAppApiSettings}
                  saveWhatsAppApiSettings={saveWhatsAppApiSettings}
                  isSavingWhatsAppApi={isSavingWhatsAppApi}
                  recentInquiries={recentInquiries}
                  updateInquiry={updateInquiry}
                  deleteInquiry={deleteInquiry}
                  isMutatingInquiry={isMutatingInquiry}
                />
              )}
            </section>
          )}
      </FashionAdminShell>

      <ProductAssignmentDrawer
        open={Boolean(productPickerTarget && productPickerContext)}
        title={productPickerContext?.title ?? "Product assignment"}
        subtitle={productPickerContext?.subtitle ?? "Assign products with context-aware rules."}
        sectionLabel={productPickerContext?.sectionLabel ?? "Assignment"}
        query={productPickerQuery}
        onQueryChange={setProductPickerQuery}
        products={filteredPickerProducts}
        previewLabel={productPickerContext?.previewLabel ?? "Preview"}
        previewProducts={productPickerContext?.previewProducts ?? []}
        getStatus={getProductPickerStatus}
        onSelect={applyPickedProduct}
        onClose={() => setProductPickerTarget(null)}
        enforceUniquePerPage={Boolean(draft.pricing.enforceUniquePerPage)}
      />

      {mediaPickerSlot || slideMediaTarget || editorialMediaField || styleNotesMediaField ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#16110d]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Media picker</p>
                <h3 className="mt-1 text-xl font-black">
                  Choose image for{" "}
                  {mediaPickerSlot
                    ? mediaPickerSlot
                    : editorialMediaField
                      ? editorialMediaFieldLabels[editorialMediaField]
                      : styleNotesMediaField
                        ? styleNotesMediaFieldLabels[styleNotesMediaField]
                        : slideMediaTarget
                          ? `${slideMediaTarget.scope} slide`
                          : "selection"}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {currentMediaSelectionUrl ? "An image is currently assigned. Pick another one or clear it." : "No image assigned yet. Choose one from the media library below."}
                </p>
              </div>
              <button type="button" onClick={closeMediaPicker} aria-label="Close media picker" className="fa-btn fa-btn-ghost rounded-full px-4 py-2 text-sm">
                Close
              </button>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                value={mediaPickerQuery}
                onChange={(event) => setMediaPickerQuery(event.target.value)}
                placeholder="Search image by name"
                className="fa-input w-full min-w-[220px] sm:max-w-sm"
                aria-label="Search media assets"
              />
              {currentMediaSelectionUrl ? (
                <FashionAdminButton className="fa-btn-danger-soft" onClick={clearPickedMediaTarget}>
                  Clear current image
                </FashionAdminButton>
              ) : null}
              <FashionAdminButton
                onClick={() => {
                  setActiveSection("media-library");
                  closeMediaPicker();
                }}
              >
                Manage library
              </FashionAdminButton>
            </div>
            <div className="grid max-h-[48dvh] md:max-h-[26rem] gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMediaAssets.map((asset, index) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => applyPickedMedia(asset.url)}
                  className={`overflow-hidden rounded-[1.6rem] border bg-white/75 text-left transition hover:-translate-y-0.5 dark:bg-white/5 ${
                    asset.url === currentMediaSelectionUrl
                      ? "border-[var(--fa-action-primary)] shadow-[0_10px_24px_-16px_rgba(35,24,16,0.55)]"
                      : "border-black/8 hover:border-slate-900 dark:border-white/10 dark:hover:border-white"
                  }`}
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="h-52 w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = withBasePath("/logo.png");
                    }}
                  />
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="text-sm font-semibold">{asset.name || `Use media option ${index + 1}`}</div>
                    {asset.url === currentMediaSelectionUrl ? <FashionAdminChip tone="success">Selected</FashionAdminChip> : null}
                  </div>
                </button>
              ))}
              {filteredMediaAssets.length === 0 ? (
                <FashionAdminValidationPanel className="sm:col-span-2 lg:col-span-3" title="No matching assets" tone="warning">
                  No images matched this search. Try a different name or upload a new image in Media Library.
                </FashionAdminValidationPanel>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default FashionBoss;


























