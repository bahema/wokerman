import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Navbar from "../components/Navbar";
import BackToTop from "../components/BackToTop";
import FashionSubnav from "../components/FashionSubnav";
import FashionProductModal from "../components/FashionProductModal";
import FashionFooter from "../components/FashionFooter";
import FashionProductImage from "../components/FashionProductImage";
import FashionInquirySheetModal from "../components/FashionInquirySheetModal";
import HeroCarousel, { type HeroSlide } from "../components/HeroCarousel/HeroCarousel";
import {
  type FashionProduct,
  featuredFashionProducts,
  trendRail
} from "../data/fashionCatalog";
import { getInitialTheme, type Theme, updateTheme } from "../utils/theme";
import { getEventThemeCssVars } from "../utils/eventTheme";
import { removeStructuredData, setStructuredData } from "../utils/seo";
import { withBasePath } from "../utils/basePath";
import { openFashionLookWhatsApp, openFashionProductCheckout } from "../utils/fashionWhatsApp";
import { submitRichLookInquiry } from "../utils/fashionInquiry";
import { formatFashionPrice } from "../utils/fashionPricing";
import { getFashionClientViewModel, type FashionPublishedSource } from "../utils/fashionDraft";
import { getFashionBadgeClassName, getFashionPriceChipClassName } from "../utils/fashionBadge";
import { resolveFashionRouteTarget } from "../utils/fashionRouteTargets";
import {
  dedupeProductsById,
  normalizeFashionDisplayConfig,
  selectPageBlockProducts,
  selectRelatedProducts
} from "../utils/fashionProductDisplay";
import { buildFashionNavbarSocials } from "../utils/fashionNavbar";
import { useFashionPublishedSync } from "../hooks/useFashionPublishedSync";
import { useSiteNavLabels } from "../hooks/useSiteNavLabels";
import { type FashionVideoPageRecord } from "../utils/fashionVideoContent";
import { useFashionVideoPublishedSync } from "../hooks/useFashionVideoPublishedSync";

const createSeededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const shuffleWithSeed = <T,>(items: T[], seed: number) => {
  const next = [...items];
  const random = createSeededRandom(seed);
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const createHeroImage = (start: string, end: string, label: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="58%" stop-color="${end}" />
          <stop offset="100%" stop-color="#15100c" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#g)" />
      <circle cx="1220" cy="180" r="220" fill="rgba(255,255,255,0.12)" />
      <circle cx="310" cy="720" r="280" fill="rgba(255,255,255,0.08)" />
      <text x="90" y="150" fill="rgba(255,255,255,0.7)" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" letter-spacing="10">${label}</text>
      <rect x="980" y="180" width="420" height="520" rx="28" fill="rgba(255,255,255,0.08)" />
      <rect x="1080" y="120" width="220" height="620" rx="30" fill="rgba(255,255,255,0.14)" />
      <rect x="118" y="540" width="410" height="170" rx="26" fill="rgba(0,0,0,0.18)" />
    </svg>`
  )}`;

const fashionHeroCards: HeroSlide[] = [
  {
    id: "hero-card-1",
    imageUrl: createHeroImage("#2f241c", "#8c684c", "NEW SEASON"),
    source: "AutoHub Fashion",
    timeAgo: "Now",
    headline: "Sharper tailoring built for daily luxury and faster affiliate conversion.",
    likes: 1284,
    href: withBasePath("/fashion/collections")
  },
  {
    id: "hero-card-2",
    imageUrl: createHeroImage("#5b4431", "#d2ad86", "WEEKEND LUXE"),
    source: "Campaign Edit",
    timeAgo: "1d",
    headline: "Soft layering and calmer neutrals for elevated everyday looks.",
    likes: 942,
    href: withBasePath("/fashion/style-notes")
  },
  {
    id: "hero-card-3",
    imageUrl: createHeroImage("#231915", "#7b5b44", "EDITORIAL"),
    source: "Editorial Desk",
    timeAgo: "2d",
    headline: "Campaign storytelling that still moves users directly into product detail and WhatsApp.",
    likes: 1108,
    href: withBasePath("/fashion/editorial")
  },
  {
    id: "hero-card-4",
    imageUrl: createHeroImage("#403026", "#b48967", "ACCESSORIES"),
    source: "Style Curation",
    timeAgo: "3d",
    headline: "Smarter add-on pieces that lift core outfits without forcing heavyweight commerce.",
    likes: 768,
    href: withBasePath("/fashion/collections")
  },
  {
    id: "hero-card-5",
    imageUrl: createHeroImage("#1d1713", "#6b4f3b", "TREND REPORT"),
    source: "Trend Watch",
    timeAgo: "4d",
    headline: "A cleaner premium surface with product-first discovery and direct contact action.",
    likes: 1356,
    href: withBasePath("/fashion")
  }
];

const Fashion = () => {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [selectedProduct, setSelectedProduct] = useState<FashionProduct | null>(null);
  const [productTrigger, setProductTrigger] = useState<HTMLElement | null>(null);
  const [lookInquiryTrigger, setLookInquiryTrigger] = useState<HTMLElement | null>(null);
  const [isLookInquirySheetOpen, setIsLookInquirySheetOpen] = useState(false);
  const trendRailRef = useRef<HTMLDivElement | null>(null);
  const elevatedRailRef = useRef<HTMLDivElement | null>(null);
  const [fashionViewModel, setFashionViewModel] = useState(() => getFashionClientViewModel());
  const [, setContentSource] = useState<FashionPublishedSource>("loading");
  const [fashionMotionSource, setFashionMotionSource] = useState<FashionPublishedSource>("loading");
  const [fashionMotionVideos, setFashionMotionVideos] = useState<FashionVideoPageRecord[]>([]);
  const [fashionMotionRotationSeed, setFashionMotionRotationSeed] = useState(() => Math.floor(Date.now() % 2147483647));
  const navLabels = useSiteNavLabels();
  const homepageDraft = fashionViewModel.homepage;
  const eventThemeVars = useMemo(() => getEventThemeCssVars("none", theme) as CSSProperties, [theme]);
  const allProducts = useMemo(
    () => (fashionViewModel.productCatalog?.length ? fashionViewModel.productCatalog : [...featuredFashionProducts, ...trendRail]),
    [fashionViewModel]
  );
  const homepageSlides = fashionViewModel.homepageSlides;
  const homepageAssignments = fashionViewModel.homepageAssignments;
  const trustPoints = fashionViewModel.trustPoints;
  const displayConfig = useMemo(
    () =>
      normalizeFashionDisplayConfig({
        enforceUniquePerPage: fashionViewModel.pricing?.enforceUniquePerPage,
        relatedProductLimit: fashionViewModel.pricing?.relatedProductLimit
      }),
    [fashionViewModel.pricing?.enforceUniquePerPage, fashionViewModel.pricing?.relatedProductLimit]
  );
  const navbarSocials = useMemo(() => buildFashionNavbarSocials(fashionViewModel.whatsapp?.phoneNumber), [fashionViewModel.whatsapp?.phoneNumber]);
  const homepageHeroCards = useMemo(
    () =>
      homepageSlides.map((slide, index) => {
        const palettes = [
          ["#2f241c", "#8c684c"],
          ["#5b4431", "#d2ad86"],
          ["#231915", "#7b5b44"],
          ["#403026", "#b48967"],
          ["#1d1713", "#6b4f3b"]
        ] as const;
        const [start, end] = palettes[index % palettes.length];
        const fallbackRoutes = ["/fashion/collections", "/fashion/style-notes", "/fashion/editorial", "/fashion/collections", "/fashion"] as const;
        const targetRoute = resolveFashionRouteTarget(slide.primaryCtaHref, fallbackRoutes[index % fallbackRoutes.length]);
        return {
          id: slide.id,
          imageUrl: slide.imageUrl?.trim() || createHeroImage(start, end, slide.eyebrow.toUpperCase()),
          source: slide.badge?.trim() || slide.eyebrow,
          timeAgo: index === 0 ? "Now" : `${index}d`,
          headline: slide.headline,
          likes: 800 + index * 120,
          href: withBasePath(targetRoute)
      };
      }),
    [homepageSlides]
  );
  const fashionMotionPreviewVideos = useMemo(() => {
    const promoted = fashionMotionVideos.filter((video) => video.isPromoted || video.placement === "promoted");
    const pool = promoted.length > 0 ? promoted : fashionMotionVideos;
    return shuffleWithSeed(pool, fashionMotionRotationSeed).slice(0, 3);
  }, [fashionMotionRotationSeed, fashionMotionVideos]);

  useEffect(() => {
    const rotate = () => setFashionMotionRotationSeed(Math.floor(Date.now() % 2147483647));
    const handleVisibility = () => {
      if (document.visibilityState === "visible") rotate();
    };
    const interval = window.setInterval(rotate, 60_000);
    window.addEventListener("focus", rotate);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", rotate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  const pageProductSelections = useMemo(() => {
    const usedIds = new Set<string>();
    const resolveAssigned = (blockId: keyof typeof homepageAssignments) =>
      (homepageAssignments[blockId] ?? [])
        .map((productId) => allProducts.find((product) => product.id === productId))
        .filter((product): product is FashionProduct => Boolean(product));
    const pick = (blockId: keyof typeof homepageAssignments, fallback: FashionProduct[], limit: number) =>
      selectPageBlockProducts({
        assigned: resolveAssigned(blockId),
        fallback,
        allProducts,
        limit,
        usedIds,
        enforceUniquePerPage: displayConfig.enforceUniquePerPage
      });

    const trendingProducts = pick(
      "trending-now",
      [...allProducts].filter((product) => product.badgeType === "trending" || product.badgeType === "hot"),
      5
    );
    const featuredDropProducts = pick("featured-drops", allProducts, 3);
    const accessoryProducts = pick(
      "accessories",
      [...allProducts].filter((product) => product.category === "Accessories" || product.category === "Bags"),
      4
    );
    const elevatedEditProducts = pick(
      "elevated-edit",
      [...allProducts].filter((product) => product.badgeType === "limited" || product.badgeType === "trending"),
      5
    );
    const mostAskedProducts = pick(
      "most-asked",
      [...allProducts].sort((a, b) => {
        const aScore = (a.badgeType === "best-seller" ? 3 : 0) + (a.badgeType === "trending" || a.badgeType === "hot" ? 2 : 0) + (a.ctaLabel?.toLowerCase().includes("ask") ? 1 : 0);
        const bScore = (b.badgeType === "best-seller" ? 3 : 0) + (b.badgeType === "trending" || b.badgeType === "hot" ? 2 : 0) + (b.ctaLabel?.toLowerCase().includes("ask") ? 1 : 0);
        return bScore - aScore;
      }),
      3
    );
    const bestSellerProducts = pick(
      "best-seller",
      [...allProducts].sort((a, b) => {
        const aScore = (a.badgeType === "best-seller" ? 4 : 0) + (a.badgeType === "new" ? 1 : 0);
        const bScore = (b.badgeType === "best-seller" ? 4 : 0) + (b.badgeType === "new" ? 1 : 0);
        return bScore - aScore;
      }),
      3
    );
    const editorPickProducts = pick(
      "editors-picks",
      [...allProducts].filter((product) => product.badgeType === "limited" || product.badgeType === "new" || product.badgeType === "editor-pick"),
      3
    );
    const shopProducts = pick("shop-the-drop", allProducts, 8);

    return {
      trendingProducts,
      featuredDropProducts,
      accessoryProducts,
      elevatedEditProducts,
      mostAskedProducts,
      bestSellerProducts,
      editorPickProducts,
      shopProducts
    };
  }, [allProducts, displayConfig.enforceUniquePerPage, homepageAssignments]);
  const {
    trendingProducts,
    featuredDropProducts,
    accessoryProducts,
    elevatedEditProducts,
    mostAskedProducts,
    bestSellerProducts,
    editorPickProducts,
    shopProducts
  } = pageProductSelections;
  const featuredLook = useMemo(() => {
    const firstBundle = Object.entries(fashionViewModel.bundleAssignments).find(([, productIds]) => productIds.length >= 3);
    if (!firstBundle) return null;
    const [bundleId, productIds] = firstBundle;
    const items = productIds
      .map((productId) => allProducts.find((product) => product.id === productId))
      .filter((product): product is FashionProduct => Boolean(product));
    if (items.length < 3) return null;

    const baseItems = items.filter(
      (item) =>
        ![
          ...featuredDropProducts,
          ...trendingProducts,
          ...accessoryProducts,
          ...elevatedEditProducts,
          ...mostAskedProducts,
          ...bestSellerProducts,
          ...editorPickProducts,
          ...shopProducts
        ].some((product) => product.id === item.id)
    );
    if (baseItems.length < 3) return null;

    const bundleMeta = fashionViewModel.bundleMeta?.[bundleId];
    return {
      bundleId,
      title: bundleMeta?.title ?? bundleId.replace(/-/g, " "),
      note: bundleMeta?.note ?? "A curated grouped set designed to move faster from discovery into one WhatsApp action.",
      hero: baseItems[0],
      companions: baseItems.slice(1, 3),
      items: baseItems.slice(0, 3)
    };
  }, [
    accessoryProducts,
    allProducts,
    bestSellerProducts,
    displayConfig.enforceUniquePerPage,
    editorPickProducts,
    elevatedEditProducts,
    fashionViewModel.bundleAssignments,
    fashionViewModel.bundleMeta,
    featuredDropProducts,
    mostAskedProducts,
    shopProducts,
    trendingProducts
  ]);
  const pageProductIds = useMemo(
    () =>
      dedupeProductsById([
        ...featuredDropProducts,
        ...trendingProducts,
        ...accessoryProducts,
        ...elevatedEditProducts,
        ...mostAskedProducts,
        ...bestSellerProducts,
        ...editorPickProducts,
        ...shopProducts,
        ...(featuredLook?.items ?? [])
      ]).map((product) => product.id),
    [
      accessoryProducts,
      bestSellerProducts,
      editorPickProducts,
      elevatedEditProducts,
      featuredDropProducts,
      featuredLook?.items,
      mostAskedProducts,
      shopProducts,
      trendingProducts
    ]
  );
  const relatedProducts = useMemo(
    () =>
      selectRelatedProducts({
        selectedProduct,
        allProducts,
        excludeIds: pageProductIds,
        limit: displayConfig.relatedProductLimit,
        allowReuseFallback: false
      }),
    [allProducts, displayConfig.relatedProductLimit, pageProductIds, selectedProduct]
  );

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  useFashionPublishedSync(setFashionViewModel, setContentSource);

  useFashionVideoPublishedSync(setFashionMotionVideos, {
    onLoaded: () => setFashionMotionSource("live"),
    onUnavailable: () => setFashionMotionSource("unavailable")
  });

  useEffect(() => {
    const canonical = new URL(withBasePath("/fashion"), `${window.location.origin}/`).toString();
    const seoProducts = allProducts.slice(0, 12);
    setStructuredData("fashion-landing", {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${canonical}#fashion`,
      url: canonical,
      name: "AutoHub Fashion New Arrivals",
      itemListElement: seoProducts.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.name,
          category: product.collection
        }
      }))
    });
    return () => removeStructuredData("fashion-landing");
  }, [allProducts]);

  const openPath = (path: string) => {
    window.history.pushState({}, "", withBasePath(path));
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openProduct = (product: FashionProduct, trigger?: HTMLElement | null) => {
    setSelectedProduct(product);
    setProductTrigger(trigger ?? null);
  };

  const moveTrendRail = (direction: "left" | "right") => {
    const rail = trendRailRef.current;
    if (!rail) return;
    const amount = Math.max(280, Math.floor(rail.clientWidth * 0.72));
    rail.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth"
    });
  };

  const moveElevatedRail = (direction: "left" | "right") => {
    const rail = elevatedRailRef.current;
    if (!rail) return;
    const amount = Math.max(280, Math.floor(rail.clientWidth * 0.72));
    rail.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth"
    });
  };

  const openLookOnWhatsApp = () => {
    if (!featuredLook) return;
    openFashionLookWhatsApp(featuredLook.title, featuredLook.items, "Fashion home complete the look");
  };

  const openLookInquirySheet = (trigger?: HTMLElement | null) => {
    if (!featuredLook) return;
    setLookInquiryTrigger(trigger ?? null);
    setIsLookInquirySheetOpen(true);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f1ea] text-[#1a1714] dark:bg-[#0f0d0b] dark:text-[#f8f2eb]" style={eventThemeVars}>
      <Navbar
        activeSection="fashion"
        theme={theme}
        onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        logoText="AutoHub"
        socials={navbarSocials}
        navLabels={navLabels}
      />
      <FashionSubnav currentPath="/fashion" />
      <main className="overflow-x-hidden">
        <section className="relative overflow-hidden px-4 pb-14 pt-14 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(218,186,140,0.38),transparent_42%),radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.45),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(149,112,67,0.24),transparent_42%),radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.03),transparent_28%)]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="rounded-[2rem] border border-black/8 bg-white/72 p-5 shadow-[0_30px_90px_-44px_rgba(48,35,18,0.45)] backdrop-blur sm:p-6 dark:border-white/10 dark:bg-white/5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7a5e3e] dark:text-[#d5b18b]">{homepageDraft.storiesEyebrow}</p>
                  <h1 className="mt-2 max-w-3xl break-words text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                    {homepageDraft.storiesTitle}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5b5047] dark:text-[#d2c5b9]">
                    {homepageDraft.storiesSupportNote}
                  </p>
                </div>
              </div>
              <HeroCarousel slides={homepageHeroCards.length > 0 ? homepageHeroCards : fashionHeroCards} autoAdvanceMs={6200} likesScope="homepage" />
            </div>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-[#faf7f2] p-5 shadow-[0_28px_90px_-52px_rgba(58,36,18,0.22)] dark:border-white/10 dark:bg-[#11100e] sm:p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7a5e3e] dark:text-[#d5b18b]">Fashion motion</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">Fashion motion landing.</h2>
              </div>
              <button
                type="button"
                onClick={() => window.open(withBasePath("/fashion/videos"), "_blank", "noopener,noreferrer")}
                className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d4ed8,#2563eb_45%,#38bdf8)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_48px_-24px_rgba(56,189,248,0.82)] sm:w-auto"
              >
                See all videos
              </button>
            </div>
            <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid min-w-[48rem] grid-flow-col auto-cols-[minmax(15rem,1fr)] gap-4 md:min-w-0 md:grid-cols-3 md:grid-flow-row md:auto-cols-fr lg:gap-5">
              {fashionMotionSource === "loading" ? (
                <div className="col-span-full rounded-[1.5rem] border border-dashed border-black/10 bg-white/70 px-5 py-10 text-center dark:border-white/10 dark:bg-white/5">
                  <p className="text-sm font-black">Loading published Fashion videos.</p>
                  <p className="mt-2 text-xs leading-6 text-[#5d5248] dark:text-[#d5c8bc]">
                    This homepage presenter waits for the live Fashion video backend before rendering.
                  </p>
                </div>
              ) : fashionMotionSource === "unavailable" ? (
                <div className="col-span-full rounded-[1.5rem] border border-dashed border-rose-200 bg-rose-50/80 px-5 py-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                  <p className="text-sm font-black text-rose-800 dark:text-rose-200">Fashion video backend unavailable.</p>
                  <p className="mt-2 text-xs leading-6 text-rose-700 dark:text-rose-200/80">
                    This presenter is in strict backend mode and cannot render video cards until the published feed returns.
                  </p>
                </div>
              ) : fashionMotionPreviewVideos.length ? fashionMotionPreviewVideos.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                onClick={() => openPath(`/fashion/videos?video=${encodeURIComponent(item.id)}&autoplay=1&entry=motion`)}
                className="min-w-0 overflow-hidden rounded-[1.5rem] border border-black/8 bg-white p-3 text-left shadow-[0_16px_40px_-34px_rgba(58,36,18,0.18)] transition hover:border-[#b68b62]/40 hover:bg-[#fdf9f4] dark:border-white/10 dark:bg-[#171513] dark:hover:border-[#d5b18b]/40 dark:hover:bg-[#1d1916]"
                  style={{ animation: `fadeUp ${0.45 + index * 0.08}s ease-out` }}
                >
                  <div className="relative aspect-video overflow-hidden rounded-[1rem] bg-[#13100d]">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,#201813,#7a5a42_55%,#c99d76)]" />
                        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
                      </>
                    )}
                    <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">{item.length}</span>
                  </div>
                  <div className="min-w-0 px-1 pb-1 pt-4">
                    <h3 className="mt-2 line-clamp-2 text-sm font-black leading-5 text-[#17130f] dark:text-[#f8f2eb] sm:text-base sm:leading-6">{item.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#5d5248] dark:text-[#d5c8bc]">{item.note}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#6f6255] dark:text-[#d5c8bc]">
                      <span>{item.viewers} views</span>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span>👍 {item.likes}</span>
                        <span>👎 {item.dislikes}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )) : (
                <div className="col-span-full rounded-[1.5rem] border border-dashed border-black/10 bg-white/70 px-5 py-10 text-center dark:border-white/10 dark:bg-white/5">
                  <p className="text-sm font-black">No published Fashion videos yet.</p>
                  <p className="mt-2 text-xs leading-6 text-[#5d5248] dark:text-[#d5c8bc]">
                    This presenter is connected correctly, but the published Fashion video feed is currently empty.
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[2rem] border border-black/8 bg-white/72 p-8 shadow-[0_28px_80px_-48px_rgba(48,35,18,0.35)] backdrop-blur sm:p-10 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7a5e3e] dark:text-[#d7b589]">{homepageDraft.heroEyebrow}</p>
              <h2 className="mt-5 max-w-3xl break-words text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl xl:text-6xl">{homepageDraft.heroHeadline}</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#584e46] dark:text-[#d2c5b9]">{homepageDraft.heroSubtext}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openPath("/fashion/collections")}
                  className="rounded-full bg-[#1a1714] px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] dark:bg-[#f8f2eb] dark:text-[#17130f]"
                >
                  {homepageDraft.heroPrimaryCtaLabel}
                </button>
                <button
                  type="button"
                  onClick={() => openPath("/fashion/editorial")}
                  className="rounded-full border border-black/10 bg-white/80 px-6 py-3 text-sm font-semibold text-[#1a1714] transition hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                >
                  {homepageDraft.heroSecondaryCtaLabel}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[2rem] bg-[linear-gradient(145deg,#201814,#7a5e3e_60%,#d5b18b)] p-6 text-white shadow-[0_26px_80px_-42px_rgba(60,34,12,0.75)]">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/75">{homepageDraft.storefrontFocusEyebrow}</p>
                <div className="mt-6 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                  <div className="grid min-w-0 gap-4">
                    <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] p-5">
                      <p className="text-sm font-semibold text-white/78">{homepageDraft.storefrontFocusCardTitle}</p>
                      <p className="mt-4 text-2xl font-black tracking-[-0.04em] [overflow-wrap:anywhere] sm:text-3xl">{homepageDraft.storefrontFocusCardHeadline}</p>
                      <p className="mt-3 text-sm leading-6 text-white/78">
                        {homepageDraft.storefrontFocusCardNote}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/10 px-4 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/68">{homepageDraft.storefrontFocusStatOneLabel}</p>
                        <p className="mt-2 text-[0.95rem] font-semibold leading-6 text-white/88 [overflow-wrap:anywhere]">{homepageDraft.storefrontFocusStatOneValue}</p>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/10 px-4 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/68">{homepageDraft.storefrontFocusStatTwoLabel}</p>
                        <p className="mt-2 text-[0.95rem] font-semibold leading-6 text-white/88 [overflow-wrap:anywhere]">{homepageDraft.storefrontFocusStatTwoValue}</p>
                      </div>
                      <div className="rounded-[1.15rem] border border-white/10 bg-white/10 px-4 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/68">{homepageDraft.storefrontFocusStatThreeLabel}</p>
                        <p className="mt-2 text-[0.95rem] font-semibold leading-6 text-white/88 [overflow-wrap:anywhere]">{homepageDraft.storefrontFocusStatThreeValue}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <div className="h-44 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.2),rgba(255,255,255,0.04))] p-4">
                      <div className="grid h-full grid-cols-[1fr_0.9fr] gap-3">
                        <div className="rounded-[1.1rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(255,255,255,0.08))]" />
                        <div className="grid gap-3">
                          <div className="rounded-[1rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))]" />
                          <div className="rounded-[1rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))]" />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/72">{homepageDraft.storefrontFocusVisualLabel}</p>
                      <p className="mt-3 text-sm leading-6 text-white/84">
                        {homepageDraft.storefrontFocusVisualNote}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8b6d49] dark:text-[#d5b18b]">{homepageDraft.pageDirectionEyebrow}</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[#564d44] dark:text-[#d5c8bc]">
                  <li>{homepageDraft.pageDirectionItemOne}</li>
                  <li>{homepageDraft.pageDirectionItemTwo}</li>
                  <li>{homepageDraft.pageDirectionItemThree}</li>
                  <li>{homepageDraft.pageDirectionItemFour}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {homepageDraft.showTrending ? (
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7a5e3e] dark:text-[#d5b18b]">{homepageDraft.featuredDropsEyebrow}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{homepageDraft.featuredDropsTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => openPath("/fashion/collections")}
                className="rounded-full border border-black/8 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#1a1714] transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
              >
                View all collections
              </button>
            </div>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
              {featuredDropProducts.map((product, index) => (
                <article
                  key={product.id}
                  className="w-full rounded-[1.7rem] border border-black/8 bg-white/75 p-5 backdrop-blur transition hover:translate-y-[-2px] hover:shadow-[0_24px_50px_-36px_rgba(48,35,18,0.45)] dark:border-white/10 dark:bg-white/5"
                  style={{ animation: `fadeUp ${0.45 + index * 0.1}s ease-out` }}
                >
                  <FashionProductImage product={product} alt={product.name} className="mb-5 h-48 w-full rounded-[1.3rem]" fallbackClassName={product.palette} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="break-words text-xl font-bold tracking-[-0.03em]">{product.name}</h3>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a5e3e] dark:text-[#d5b18b]">{product.collection}</p>
                      <p className="mt-3 text-sm leading-6 text-[#62594f] dark:text-[#d1c4b8]">{product.note}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => openProduct(product, event.currentTarget)}
                    className="mt-5 rounded-full bg-[#1a1714] px-4 py-2 text-sm font-semibold text-white dark:bg-[#f8f2eb] dark:text-[#17130f]"
                  >
                    {product.ctaLabel ?? "Open product"}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
        ) : null}

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-white/70 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7a5e3e] dark:text-[#d5b18b]">Trending Now</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">A horizontal product strip that feels like a real storefront rail.</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveTrendRail("left")}
                  className="grid h-11 w-11 place-items-center rounded-full border border-black/8 bg-white/90 text-xl text-[#1a1714] transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                  aria-label="Scroll trending rail left"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => moveTrendRail("right")}
                  className="grid h-11 w-11 place-items-center rounded-full border border-black/8 bg-white/90 text-xl text-[#1a1714] transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                  aria-label="Scroll trending rail right"
                >
                  ›
                </button>
              </div>
            </div>
            <div
              ref={trendRailRef}
              className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {trendingProducts.map((item) => (
                <article
                  key={item.id}
                  className="w-[74vw] max-w-[19rem] shrink-0 rounded-[1.6rem] border border-black/8 bg-[#fbf8f3] p-4 transition hover:shadow-[0_24px_50px_-36px_rgba(48,35,18,0.45)] sm:w-[42vw] md:w-[30vw] lg:w-[22vw] dark:border-white/10 dark:bg-[#171411]"
                >
                  <FashionProductImage product={item} alt={item.name} className="h-48 w-full rounded-[1.2rem]" fallbackClassName={item.palette} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8d6c49] dark:text-[#d5b18b]">{item.collection}</p>
                      <h3 className="mt-2 text-lg font-bold tracking-[-0.03em]">{item.name}</h3>
                    </div>
                    {item.badge ? (
                      <span className={getFashionBadgeClassName(item.badgeType, item.badge)}>
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#62594f] dark:text-[#d1c4b8]">{item.note}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={getFashionPriceChipClassName(item.badgeType, item.badge)}>{formatFashionPrice(item.price)}</span>
                    <button
                      type="button"
                      onClick={(event) => openProduct(item, event.currentTarget)}
                      className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold dark:border-white/10 dark:bg-white/5"
                    >
                      Quick view
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {featuredLook ? (
          <section className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-white/75 p-6 shadow-[0_24px_60px_-40px_rgba(48,35,18,0.32)] backdrop-blur dark:border-white/10 dark:bg-white/5 md:p-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7a5e3e] dark:text-[#d5b18b]">{homepageDraft.completeLookEyebrow}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{homepageDraft.completeLookTitle}</h2>
                </div>
                <button
                  type="button"
                  onClick={openLookOnWhatsApp}
                  className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                >
                  {homepageDraft.completeLookCtaLabel}
                </button>
                <button
                  type="button"
                  onClick={(event) => openLookInquirySheet(event.currentTarget)}
                  className="rounded-full border border-[#1a1714]/15 bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1714] transition hover:bg-[#f6f1ea] dark:border-white/15 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                >
                  Send look inquiry sheet
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.8rem] bg-[#17130f] p-5 text-white dark:bg-[#120f0c]">
                  <FashionProductImage product={featuredLook.hero} alt={featuredLook.hero.name} className="h-72 w-full rounded-[1.4rem]" fallbackClassName={featuredLook.hero.palette} />
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d5b18b]">{featuredLook.title}</p>
                      <h3 className="mt-2 text-xl font-black tracking-[-0.03em] sm:text-2xl">{featuredLook.hero.name}</h3>
                    </div>
                    {featuredLook.hero.badge ? (
                      <span className={getFashionBadgeClassName(featuredLook.hero.badgeType, featuredLook.hero.badge)}>
                        {featuredLook.hero.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/74">{featuredLook.note}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                      {featuredLook.hero.collection}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                      {featuredLook.hero.occasion}
                    </span>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <span className={getFashionPriceChipClassName(featuredLook.hero.badgeType, featuredLook.hero.badge)}>{formatFashionPrice(featuredLook.hero.price)}</span>
                    <button
                      type="button"
                      onClick={(event) => openProduct(featuredLook.hero, event.currentTarget)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Open main piece
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {featuredLook.companions.map((item) => (
                    <article
                      key={item.id}
                      className="grid gap-4 rounded-[1.5rem] border border-black/8 bg-[#fbf8f3] p-4 dark:border-white/10 dark:bg-[#171411] sm:grid-cols-[7.5rem_1fr]"
                    >
                      <FashionProductImage product={item} alt={item.name} className="h-28 w-full rounded-[1rem] sm:h-full" fallbackClassName={item.palette} />
                      <div className="flex flex-col justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8d6c49] dark:text-[#d5b18b]">{item.collection}</p>
                          <h4 className="mt-1 text-base font-bold tracking-[-0.02em]">{item.name}</h4>
                          <p className="mt-2 text-sm leading-6 text-[#62594f] dark:text-[#d1c4b8]">{item.note}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className={getFashionPriceChipClassName(item.badgeType, item.badge)}>{formatFashionPrice(item.price)}</span>
                          <button
                            type="button"
                            onClick={(event) => openProduct(item, event.currentTarget)}
                            className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-[#f4eee6] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            View piece
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}

                  <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8d6c49] dark:text-[#d5b18b]">{homepageDraft.completeLookValueEyebrow}</p>
                    <p className="mt-2 text-sm leading-7 text-[#5f564d] dark:text-[#d1c4b8]">
                      {homepageDraft.completeLookValueNote}
                    </p>
                    <p className="mt-3 text-base font-black">
                      {formatFashionPrice(featuredLook.items.reduce((sum, item) => sum + item.price, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {homepageDraft.showAccessories && accessoryProducts.length > 0 ? (
          <section className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-white/75 p-6 shadow-[0_24px_70px_-42px_rgba(48,35,18,0.28)] backdrop-blur dark:border-white/10 dark:bg-white/5 md:p-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7a5e3e] dark:text-[#d5b18b]">{homepageDraft.accessoriesEyebrow}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{homepageDraft.accessoriesTitle}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => openPath("/fashion/collections")}
                  className="rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1714] transition hover:bg-[#f6f1ea] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                >
                  {homepageDraft.accessoriesCtaLabel}
                </button>
              </div>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))]">
                {accessoryProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group w-full rounded-[1.6rem] border border-black/8 bg-[#fbf8f3] p-4 transition hover:translate-y-[-2px] hover:shadow-[0_20px_48px_-30px_rgba(48,35,18,0.28)] dark:border-white/10 dark:bg-[#171411]"
                  >
                    <FashionProductImage product={product} alt={product.name} className="h-40 w-full rounded-[1.2rem] transition duration-300 group-hover:scale-[1.02]" fallbackClassName={product.palette} />
                    <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8d6c49] dark:text-[#d5b18b]">{product.collection}</p>
                    <h3 className="mt-2 text-lg font-bold tracking-[-0.03em]">{product.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#62594f] dark:text-[#d1c4b8]">{product.note}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                    <span className={getFashionPriceChipClassName(product.badgeType, product.badge)}>{formatFashionPrice(product.price)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => openProduct(product, event.currentTarget)}
                          className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-[#f4eee6] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void openFashionProductCheckout(product, "Fashion home accessories");
                          }}
                          className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                        >
                          Ask
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {elevatedEditProducts.length > 0 ? (
          <section className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-[linear-gradient(145deg,#19120e,#3d2b20_48%,#9c7453)] p-6 text-white shadow-[0_24px_70px_-40px_rgba(40,24,12,0.42)] dark:border-white/10 md:p-8">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d5b18b]">{homepageDraft.elevatedEditEyebrow}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{homepageDraft.elevatedEditTitle}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => moveElevatedRail("left")}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-lg font-bold transition hover:bg-white/10"
                    aria-label={`Scroll ${homepageDraft.elevatedEditEyebrow.toLowerCase()} left`}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveElevatedRail("right")}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-lg font-bold transition hover:bg-white/10"
                    aria-label={`Scroll ${homepageDraft.elevatedEditEyebrow.toLowerCase()} right`}
                  >
                    →
                  </button>
                </div>
              </div>
              <div ref={elevatedRailRef} className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {elevatedEditProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group min-w-[18rem] max-w-[18rem] rounded-[1.6rem] border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                  >
                    <FashionProductImage product={product} alt={product.name} className="h-44 w-full rounded-[1.2rem] transition duration-300 group-hover:scale-[1.02]" fallbackClassName={product.palette} />
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d5b18b]">{product.collection}</p>
                        <h3 className="mt-2 text-lg font-bold tracking-[-0.03em]">{product.name}</h3>
                      </div>
                      {product.badge ? (
                        <span className={getFashionBadgeClassName(product.badgeType, product.badge)}>
                          {product.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/74">{product.note}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className={getFashionPriceChipClassName(product.badgeType, product.badge)}>{formatFashionPrice(product.price)}</span>
                      <button
                        type="button"
                        onClick={(event) => openProduct(product, event.currentTarget)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
                      >
                        Preview
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {homepageDraft.showMostAsked ? (
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-[#17130f] p-6 text-white shadow-[0_26px_80px_-42px_rgba(40,24,12,0.55)] md:p-8 dark:border-white/10">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d5b18b]">{homepageDraft.mostAskedEyebrow}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{homepageDraft.mostAskedTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => openPath("/fashion/collections")}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {homepageDraft.mostAskedCtaLabel}
              </button>
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
              {mostAskedProducts.map((product, index) => (
                <article key={product.id} className="w-full rounded-[1.6rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <FashionProductImage product={product} alt={product.name} className="h-48 w-full rounded-[1.2rem]" fallbackClassName={product.palette} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d5b18b]">
                        Rank 0{index + 1} · {product.collection}
                      </p>
                      <h3 className="mt-2 text-lg font-bold tracking-[-0.03em]">{product.name}</h3>
                    </div>
                    {product.badge ? (
                      <span className={getFashionBadgeClassName(product.badgeType, product.badge)}>
                        {product.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/74">{product.note}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.styleTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/78"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className={getFashionPriceChipClassName(product.badgeType, product.badge)}>{formatFashionPrice(product.price)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => openProduct(product, event.currentTarget)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void openFashionProductCheckout(product, "Fashion home most asked");
                        }}
                        className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                      >
                        Ask now
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        ) : null}

        {homepageDraft.showBestSeller && bestSellerProducts.length > 0 ? (
          <section className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-white/75 p-6 shadow-[0_24px_70px_-40px_rgba(48,35,18,0.3)] backdrop-blur dark:border-white/10 dark:bg-white/5 md:p-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7a5e3e] dark:text-[#d5b18b]">{homepageDraft.bestSellerEyebrow}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{homepageDraft.bestSellerTitle}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => openPath("/fashion/collections")}
                  className="rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1714] transition hover:bg-[#f6f1ea] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                >
                  {homepageDraft.bestSellerCtaLabel}
                </button>
              </div>

              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
                {bestSellerProducts.map((product, index) => (
                  <article key={product.id} className="w-full rounded-[1.6rem] border border-black/8 bg-[#fbf8f3] p-4 dark:border-white/10 dark:bg-[#171411]">
                    <FashionProductImage product={product} alt={product.name} className="h-44 w-full rounded-[1.2rem]" fallbackClassName={product.palette} />
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8d6c49] dark:text-[#d5b18b]">
                          Week rank 0{index + 1}
                        </p>
                        <h3 className="mt-2 break-words text-lg font-bold tracking-[-0.03em]">{product.name}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7c6652] dark:text-[#cfbfaf]">{product.collection}</p>
                      </div>
                      <span className="rounded-full bg-[#1a1714] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white dark:bg-[#f8f2eb] dark:text-[#17130f]">
                        {product.badge ?? "Top pick"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#62594f] dark:text-[#d1c4b8]">{product.note}</p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className={getFashionPriceChipClassName(product.badgeType, product.badge)}>{formatFashionPrice(product.price)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => openProduct(product, event.currentTarget)}
                          className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1714] transition hover:bg-[#f6f1ea] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void openFashionProductCheckout(product, "Fashion home best seller");
                          }}
                          className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                        >
                          Ask
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {homepageDraft.showEditorsPicks && editorPickProducts.length > 0 ? (
          <section className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-[linear-gradient(145deg,#f0e6d8,#d9c0a3_52%,#9b7656)] p-6 shadow-[0_24px_70px_-40px_rgba(74,46,22,0.35)] dark:border-white/10 dark:bg-[linear-gradient(145deg,#1a1511,#4f3a2a_52%,#b98b63)] md:p-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6e533a] dark:text-[#e0c19a]">{homepageDraft.editorsPicksEyebrow}</p>
                  <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] text-[#1a1714] sm:text-3xl dark:text-[#f8f2eb]">
                    {homepageDraft.editorsPicksTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => openPath("/fashion/editorial")}
                  className="rounded-full border border-black/8 bg-white/80 px-5 py-2.5 text-sm font-semibold text-[#1a1714] transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                >
                  {homepageDraft.editorsPicksCtaLabel}
                </button>
              </div>

              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
                {editorPickProducts.map((product) => (
                  <article key={product.id} className="w-full rounded-[1.6rem] border border-black/8 bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-black/20">
                    <FashionProductImage product={product} alt={product.name} className="h-44 w-full rounded-[1.2rem]" fallbackClassName={product.palette} />
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a5e3e] dark:text-[#d5b18b]">{product.collection}</p>
                        <h3 className="mt-2 break-words text-lg font-bold tracking-[-0.03em] text-[#1a1714] dark:text-[#f8f2eb]">{product.name}</h3>
                      </div>
                      {product.badge ? (
                        <span className={getFashionBadgeClassName(product.badgeType, product.badge)}>
                          {product.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#5d5248] dark:text-[#d5c8bc]">{product.note}</p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className={getFashionPriceChipClassName(product.badgeType, product.badge)}>{formatFashionPrice(product.price)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => openProduct(product, event.currentTarget)}
                          className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1714] transition hover:bg-[#f6f1ea] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void openFashionProductCheckout(product, "Fashion home editor picks");
                          }}
                          className="rounded-full bg-[#1a1714] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#2b241d] dark:bg-[#f8f2eb] dark:text-[#17130f] dark:hover:bg-[#f0e8de]"
                        >
                          Ask
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7a5e3e] dark:text-[#d5b18b]">{homepageDraft.shopTheDropEyebrow}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{homepageDraft.shopTheDropTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => openPath("/fashion/style-notes")}
                className="rounded-full border border-black/8 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#1a1714] transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
              >
                {homepageDraft.shopTheDropCtaLabel}
              </button>
            </div>

            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
              {shopProducts.map((product, index) => (
                <article
                  key={product.id}
                  className="w-full rounded-[1.8rem] border border-black/8 bg-white/78 p-5 shadow-[0_24px_60px_-38px_rgba(48,35,18,0.28)] backdrop-blur transition hover:translate-y-[-2px] hover:shadow-[0_28px_70px_-36px_rgba(48,35,18,0.42)] dark:border-white/10 dark:bg-white/5"
                  style={{ animation: `fadeUp ${0.4 + index * 0.06}s ease-out` }}
                >
                  <FashionProductImage product={product} alt={product.name} className="h-60 w-full rounded-[1.35rem]" fallbackClassName={product.palette} />
                  <div className="mt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8d6c49] dark:text-[#d5b18b]">{product.collection}</p>
                        <h3 className="mt-2 break-words text-xl font-bold tracking-[-0.03em]">{product.name}</h3>
                      </div>
                      {product.badge ? (
                        <span className={getFashionBadgeClassName(product.badgeType, product.badge)}>
                          {product.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#62594f] dark:text-[#d1c4b8]">{product.note}</p>
                    <div className="mt-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7f6244] dark:text-[#d3b18a]">{product.tone}</p>
                        <span className={`mt-1 ${getFashionPriceChipClassName(product.badgeType, product.badge)}`}>{formatFashionPrice(product.price)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => openProduct(product, event.currentTarget)}
                        className="rounded-full bg-[#1a1714] px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px] dark:bg-[#f8f2eb] dark:text-[#17130f]"
                      >
                        View details
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] bg-[#17130f] p-6 text-white md:grid-cols-[1.05fr_0.95fr] md:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d5b18b]">{homepageDraft.trustEyebrow}</p>
              <h2 className="mt-4 break-words text-3xl font-black tracking-[-0.04em] sm:text-4xl">{homepageDraft.trustTitle}</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/72">
                {homepageDraft.trustDescription}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustPoints.map((point) => (
                <div key={point} className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white/84">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>
        <FashionFooter />
      </main>

      <BackToTop />
      <FashionProductModal
        product={selectedProduct}
        relatedProducts={relatedProducts}
        onClose={() => setSelectedProduct(null)}
        returnFocusTo={productTrigger}
        sourceLabel="Fashion home"
      />
      <FashionInquirySheetModal
        open={isLookInquirySheetOpen}
        onClose={() => setIsLookInquirySheetOpen(false)}
        returnFocusTo={lookInquiryTrigger}
        title="Complete look inquiry"
        subtitle="Send a structured grouped inquiry with lead image delivery when API mode is available."
        inquiryOptions={[{ id: "look", label: "Complete look inquiry" }]}
        defaultInquiryType="look"
        submitLabel="Send look inquiry"
        onSubmit={async (sheet) => {
          if (!featuredLook) {
            return { ok: false, message: "No look is available right now." };
          }
          const result = await submitRichLookInquiry(featuredLook.title, featuredLook.items, "Fashion home complete the look", sheet);
          return {
            ok: result.ok,
            message:
              result.ok
                ? "Look inquiry sent successfully."
                : result.fallbackUsed
                  ? "API send was unavailable. Opened quick WhatsApp fallback."
                  : result.error || "Unable to send look inquiry."
          };
        }}
      />
    </div>
  );
};

export default Fashion;
