import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Navbar from "../components/Navbar";
import BackToTop from "../components/BackToTop";
import FashionSubnav from "../components/FashionSubnav";
import FashionProductModal from "../components/FashionProductModal";
import FashionProductImage from "../components/FashionProductImage";
import { type FashionProduct, featuredFashionProducts, trendRail } from "../data/fashionCatalog";
import { getInitialTheme, type Theme, updateTheme } from "../utils/theme";
import { getEventThemeCssVars } from "../utils/eventTheme";
import { removeStructuredData, setStructuredData } from "../utils/seo";
import { withBasePath } from "../utils/basePath";
import { openFashionStoryWhatsApp } from "../utils/fashionWhatsApp";
import { formatFashionPrice } from "../utils/fashionPricing";
import { getFashionClientViewModel } from "../utils/fashionDraft";
import { getFashionBadgeClassName, getFashionPriceChipClassName } from "../utils/fashionBadge";
import { dedupeProductsById, normalizeFashionDisplayConfig, selectRelatedProducts } from "../utils/fashionProductDisplay";
import { buildFashionNavbarSocials } from "../utils/fashionNavbar";
import { useFashionPublishedSync } from "../hooks/useFashionPublishedSync";
import { useSiteNavLabels } from "../hooks/useSiteNavLabels";

type CollectionFilter = "all" | "new" | "trending" | "limited" | string;
type CollectionSort = "featured" | "newest" | "price-low" | "price-high";

const FashionCollections = () => {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [selectedProduct, setSelectedProduct] = useState<FashionProduct | null>(null);
  const [productTrigger, setProductTrigger] = useState<HTMLElement | null>(null);
  const [fashionViewModel, setFashionViewModel] = useState(() => getFashionClientViewModel());
  const navLabels = useSiteNavLabels();
  const collectionsDraft = fashionViewModel.collections;
  const [focusedProductId, setFocusedProductId] = useState("");
  const [activeFilter, setActiveFilter] = useState<CollectionFilter>("all");
  const [sortMode, setSortMode] = useState<CollectionSort>(collectionsDraft.defaultSort);
  const [visibleCount, setVisibleCount] = useState(collectionsDraft.initialVisibleCount);
  const productCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const eventThemeVars = useMemo(() => getEventThemeCssVars("none", theme) as CSSProperties, [theme]);
  const allProducts = useMemo(
    () => (fashionViewModel.productCatalog?.length ? fashionViewModel.productCatalog : [...featuredFashionProducts, ...trendRail]),
    [fashionViewModel]
  );
  const displayConfig = useMemo(
    () =>
      normalizeFashionDisplayConfig({
        enforceUniquePerPage: fashionViewModel.pricing?.enforceUniquePerPage,
        relatedProductLimit: fashionViewModel.pricing?.relatedProductLimit
      }),
    [fashionViewModel.pricing?.enforceUniquePerPage, fashionViewModel.pricing?.relatedProductLimit]
  );
  const navbarSocials = useMemo(() => buildFashionNavbarSocials(fashionViewModel.whatsapp?.phoneNumber), [fashionViewModel.whatsapp?.phoneNumber]);
  const filterChips = useMemo<CollectionFilter[]>(
    () =>
      fashionViewModel.collectionFilters.length > 0
        ? fashionViewModel.collectionFilters.map((filter) => filter.id)
        : ["all", "new", "trending", "limited", ...Array.from(new Set(allProducts.map((item) => item.category)))],
    [allProducts, fashionViewModel.collectionFilters]
  );
  const resolveFilterLabel = (chip: CollectionFilter) => fashionViewModel.collectionFilters.find((filter) => filter.id === chip)?.label ?? chip;
  const visibleProducts = useMemo(() => {
    const filtered = allProducts.filter((item) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "new") return item.badgeType === "new";
      if (activeFilter === "trending") return item.badgeType === "trending" || item.badgeType === "hot";
      if (activeFilter === "limited") return item.badgeType === "limited";
      const label = resolveFilterLabel(activeFilter).toLowerCase();
      return item.category === resolveFilterLabel(activeFilter) || item.collection.toLowerCase() === label || item.styleTags.some((tag) => tag.toLowerCase() === label);
    });

    const withIndex = filtered.map((item) => ({
      item,
      index: allProducts.findIndex((source) => source.id === item.id)
    }));

    withIndex.sort((a, b) => {
      switch (sortMode) {
        case "newest":
          return b.index - a.index;
        case "price-low":
          return a.item.price - b.item.price;
        case "price-high":
          return b.item.price - a.item.price;
        case "featured":
        default:
          return a.index - b.index;
      }
    });

    return dedupeProductsById(withIndex.map((entry) => entry.item));
  }, [activeFilter, allProducts, sortMode]);
  const spotlightProduct =
    (collectionsDraft.spotlightMode === "manual"
      ? allProducts.find((product) => product.id === fashionViewModel.collectionSpotlightProductId)
      : visibleProducts[0]) ??
    visibleProducts[0] ??
    null;
  const listProducts = useMemo(
    () =>
      displayConfig.enforceUniquePerPage && spotlightProduct
        ? visibleProducts.filter((product) => product.id !== spotlightProduct.id)
        : visibleProducts,
    [displayConfig.enforceUniquePerPage, spotlightProduct, visibleProducts]
  );
  const displayedProducts = useMemo(() => listProducts.slice(0, visibleCount), [listProducts, visibleCount]);
  const canLoadMore = displayedProducts.length < listProducts.length;
  const spotlightTitle = useMemo(() => {
    if (activeFilter === "all") return "Collection spotlight";
    if (activeFilter === "new") return "New arrivals spotlight";
    if (activeFilter === "trending") return "Trending spotlight";
    if (activeFilter === "limited") return "Limited drop spotlight";
    return `${activeFilter} spotlight`;
  }, [activeFilter]);
  const relatedProducts = useMemo(
    () =>
      selectRelatedProducts({
        selectedProduct,
        allProducts,
        excludeIds: [...displayedProducts.map((product) => product.id), ...(spotlightProduct ? [spotlightProduct.id] : [])],
        limit: displayConfig.relatedProductLimit
      }),
    [allProducts, displayConfig.relatedProductLimit, displayedProducts, selectedProduct, spotlightProduct]
  );

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  useFashionPublishedSync(setFashionViewModel);

  useEffect(() => {
    setSortMode(collectionsDraft.defaultSort);
    setVisibleCount(collectionsDraft.initialVisibleCount);
  }, [collectionsDraft.defaultSort, collectionsDraft.initialVisibleCount]);

  useEffect(() => {
    setVisibleCount(collectionsDraft.initialVisibleCount);
  }, [activeFilter, collectionsDraft.initialVisibleCount, sortMode]);

  useEffect(() => {
    const syncFocusProduct = () => {
      const search = new URLSearchParams(window.location.search);
      setFocusedProductId(search.get("focusProduct")?.trim() ?? "");
    };

    syncFocusProduct();
    window.addEventListener("popstate", syncFocusProduct);
    return () => {
      window.removeEventListener("popstate", syncFocusProduct);
    };
  }, []);

  useEffect(() => {
    if (!focusedProductId) return;
    const targetIndex = listProducts.findIndex((product) => product.id === focusedProductId);
    if (targetIndex < 0) return;

    if (activeFilter !== "all") {
      setActiveFilter("all");
      return;
    }

    if (targetIndex >= visibleCount) {
      setVisibleCount(targetIndex + 1);
      return;
    }

    const timer = window.setTimeout(() => {
      const element = productCardRefs.current[focusedProductId];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      window.setTimeout(() => {
        setFocusedProductId("");
        const url = new URL(window.location.href);
        url.searchParams.delete("focusProduct");
        window.history.replaceState({}, "", url.toString());
      }, 3800);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [activeFilter, focusedProductId, listProducts, visibleCount]);

  useEffect(() => {
    const canonical = new URL(withBasePath("/fashion/collections"), `${window.location.origin}/`).toString();
    setStructuredData("fashion-collections", {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      url: canonical,
      name: "AutoHub Fashion Collections",
      itemListElement: allProducts.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: { "@type": "Product", name: product.name, category: product.collection }
      }))
    });
    return () => removeStructuredData("fashion-collections");
  }, [allProducts]);

  const openProduct = (product: FashionProduct, trigger?: HTMLElement | null) => {
    setSelectedProduct(product);
    setProductTrigger(trigger ?? null);
  };

  const openCollectionInquiry = () => {
    if (listProducts.length === 0) return;
    const inquiryItems = listProducts.slice(0, 3);
    const inquiryTitle =
      activeFilter === "all"
        ? "Fashion Collections"
        : activeFilter === "new"
          ? "New Arrivals Collection"
          : activeFilter === "trending"
            ? "Trending Collection"
            : activeFilter === "limited"
              ? "Limited Drop Collection"
              : `${activeFilter} Collection`;
    openFashionStoryWhatsApp(inquiryTitle, inquiryItems, `Fashion collections ${activeFilter}`);
  };

  const getFilterCount = (chip: CollectionFilter) =>
    allProducts.filter((item) => {
      if (chip === "all") return true;
      if (chip === "new") return item.badgeType === "new";
      if (chip === "trending") return item.badgeType === "trending" || item.badgeType === "hot";
      if (chip === "limited") return item.badgeType === "limited";
      const label = resolveFilterLabel(chip).toLowerCase();
      return item.category === resolveFilterLabel(chip) || item.collection.toLowerCase() === label || item.styleTags.some((tag) => tag.toLowerCase() === label);
    }).length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f2ede6] text-[#191613] dark:bg-[#110f0d] dark:text-[#f7f1ea]" style={eventThemeVars}>
      <Navbar
        activeSection="fashion"
        theme={theme}
        onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        logoText="AutoHub"
        socials={navbarSocials}
        navLabels={navLabels}
      />
      <FashionSubnav currentPath="/fashion/collections" />

      <main className="overflow-x-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f6a46] dark:text-[#d6b798]">Collections</p>
              <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">{collectionsDraft.pageTitle}</h1>
            </div>
            <div className="rounded-full border border-black/8 bg-white/70 px-5 py-3 text-sm font-semibold text-[#584d43] dark:border-white/10 dark:bg-white/5 dark:text-[#d7cabd]">
              Showing {displayedProducts.length} of {listProducts.length}
            </div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {filterChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setActiveFilter(chip)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === chip
                    ? "border-[#1a1714] bg-[#1a1714] text-white dark:border-[#f8f2eb] dark:bg-[#f8f2eb] dark:text-[#17130f]"
                    : "border-black/8 bg-white/70 text-[#584d43] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#d7cabd] dark:hover:bg-white/10"
                }`}
              >
                {chip === "all"
                  ? "All"
                  : chip === "new"
                    ? "New"
                    : chip === "trending"
                      ? "Trending"
                      : chip === "limited"
                        ? "Limited"
                        : resolveFilterLabel(chip)}{" "}
                <span className="opacity-70">({getFilterCount(chip)})</span>
              </button>
            ))}
          </div>

          <div className="sticky top-24 z-10 mb-8 flex flex-col gap-3 rounded-[1.6rem] border border-black/8 bg-[#f2ede6]/90 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-[#110f0d]/90">
            <p className="text-sm font-semibold text-[#584d43] dark:text-[#d7cabd]">
              {activeFilter === "all" ? "Showing all promoted items" : `Filter: ${activeFilter}`}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openCollectionInquiry}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                {collectionsDraft.collectionInquiryLabel}
              </button>
              <div className="flex flex-wrap gap-2">
                {([
                  ["featured", "Featured"],
                  ["newest", "Newest"],
                  ["price-low", "Price: Low to High"],
                  ["price-high", "Price: High to Low"]
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSortMode(value)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      sortMode === value
                        ? "border-[#1a1714] bg-[#1a1714] text-white dark:border-[#f8f2eb] dark:bg-[#f8f2eb] dark:text-[#17130f]"
                        : "border-black/8 bg-white/70 text-[#584d43] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#d7cabd] dark:hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-[1.5rem] border border-black/8 bg-white/75 p-5 dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8d6c49] dark:text-[#d5b18b]">Active collection focus</p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5f544a] dark:text-[#d5c8bc]">
              {activeFilter === "all"
                ? collectionsDraft.pageIntro
                : activeFilter === "new"
                  ? "This filter pushes newer arrivals first so users land on fresh pieces before they reach the wider collection."
                  : activeFilter === "trending"
                    ? "This filter keeps high-attention pieces forward so the collection page can convert quicker through WhatsApp."
                    : activeFilter === "limited"
                      ? "This filter highlights scarce pieces that benefit from faster contact and stronger urgency."
                  : `This filter narrows the page to ${resolveFilterLabel(activeFilter).toLowerCase()} so users can browse one category without losing the campaign feel.`}
            </p>
          </div>

          {spotlightProduct ? (
            <section className="mb-8 rounded-[2rem] border border-black/8 bg-[linear-gradient(145deg,#f6ede2,#dfc7ab_52%,#a57d59)] p-6 shadow-[0_24px_70px_-42px_rgba(72,46,20,0.3)] dark:border-white/10 dark:bg-[linear-gradient(145deg,#17120e,#4d3928_52%,#b78a64)] md:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6f5338] dark:text-[#dfc19a]">{spotlightTitle}</p>
                  <h2 className="break-words text-2xl font-black tracking-[-0.03em] text-[#1a1714] sm:text-3xl dark:text-[#f8f2eb]">
                    {spotlightProduct.name}
                  </h2>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7a5e3e] dark:text-[#d5b18b]">
                    {spotlightProduct.collection} · {spotlightProduct.category}
                  </p>
                  <p className="max-w-2xl text-sm leading-7 text-[#584d43] dark:text-[#d7cabd]">
                    {spotlightProduct.note} Use this banner to push the strongest piece from the current filter before the user enters the full browsing grid.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {spotlightProduct.styleTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-black/8 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#57483b] dark:border-white/10 dark:bg-white/5 dark:text-[#e3d7ca]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={(event) => openProduct(spotlightProduct, event.currentTarget)}
                      className="rounded-full bg-[#1a1714] px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] dark:bg-[#f8f2eb] dark:text-[#17130f]"
                    >
                      Open spotlight
                    </button>
                    <div className="rounded-full border border-black/8 bg-white/70 px-5 py-3 text-sm font-bold text-[#1a1714] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb]">
                      <span className={getFashionPriceChipClassName(spotlightProduct.badgeType, spotlightProduct.badge)}>{formatFashionPrice(spotlightProduct.price)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_0.82fr]">
                  <FashionProductImage product={spotlightProduct} alt={spotlightProduct.name} className="min-h-[16rem] w-full rounded-[1.7rem]" fallbackClassName={spotlightProduct.palette} />
                  <div className="grid gap-4">
                    <div className="rounded-[1.5rem] border border-black/8 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a5e3e] dark:text-[#d5b18b]">Availability</p>
                      <p className="mt-2 text-sm font-semibold text-[#1a1714] dark:text-[#f8f2eb]">{spotlightProduct.availabilityLabel}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-black/8 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a5e3e] dark:text-[#d5b18b]">Occasion</p>
                      <p className="mt-2 text-sm font-semibold text-[#1a1714] dark:text-[#f8f2eb]">{spotlightProduct.occasion}</p>
                    </div>
                    {spotlightProduct.badge ? (
                      <div className="rounded-[1.5rem] border border-black/8 bg-[#1a1714] p-4 text-white dark:border-white/10 dark:bg-[#f8f2eb] dark:text-[#17130f]">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">Attention level</p>
                        <p className="mt-2 text-sm font-black uppercase tracking-[0.12em]">{spotlightProduct.badge}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="mb-8 rounded-[2rem] border border-dashed border-black/10 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8d6c49] dark:text-[#d5b18b]">No products in this view</p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-3xl">Nothing matches the current filter yet.</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#5f544a] dark:text-[#d5c8bc]">
                Switch to another filter or reset back to all collections to keep the browsing flow moving.
              </p>
            </section>
          )}

          {displayedProducts.length > 0 ? (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
              {displayedProducts.map((product, index) => (
              <article
                key={product.id}
                ref={(node) => {
                  productCardRefs.current[product.id] = node;
                }}
                className={`group w-full rounded-[1.8rem] border p-5 shadow-[0_24px_60px_-38px_rgba(48,35,18,0.28)] backdrop-blur transition hover:translate-y-[-2px] hover:shadow-[0_28px_70px_-36px_rgba(48,35,18,0.42)] dark:bg-white/5 ${
                  focusedProductId === product.id
                    ? "border-amber-300 ring-2 ring-amber-200/70 shadow-[0_0_0_1px_rgba(253,230,138,0.55),0_30px_80px_-42px_rgba(180,120,45,0.5)] dark:border-amber-200 dark:ring-amber-200/40"
                    : "border-black/8 dark:border-white/10"
                }`}
                style={{ animation: `fadeUp ${0.35 + index * 0.05}s ease-out` }}
              >
                <FashionProductImage product={product} alt={product.name} className="h-56 w-full rounded-[1.35rem] transition duration-300 group-hover:scale-[1.02]" fallbackClassName={product.palette} />
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8d6c49] dark:text-[#d5b18b]">{product.collection}</p>
                    <h2 className="mt-2 break-words text-xl font-bold tracking-[-0.03em]">{product.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#655a4f] dark:text-[#d5c8bc]">{product.note}</p>
                  </div>
                  {product.badge ? (
                    <span className={getFashionBadgeClassName(product.badgeType, product.badge)}>
                      {product.badge}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className={getFashionPriceChipClassName(product.badgeType, product.badge)}>{formatFashionPrice(product.price)}</span>
                  <button
                    type="button"
                    onClick={(event) => openProduct(product, event.currentTarget)}
                    className="rounded-full bg-[#1a1714] px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px] dark:bg-[#f8f2eb] dark:text-[#17130f]"
                  >
                    Open details
                  </button>
                </div>
              </article>
              ))}
            </div>
          ) : null}

          {canLoadMore ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(prev + collectionsDraft.loadMoreCount, listProducts.length))}
                className="rounded-full border border-black/8 bg-white px-6 py-3 text-sm font-semibold text-[#1a1714] transition hover:bg-[#f6f1ea] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
              >
                {collectionsDraft.loadMoreLabel}
              </button>
            </div>
          ) : null}
        </div>
      </main>

      <BackToTop />
      <FashionProductModal
        product={selectedProduct}
        relatedProducts={relatedProducts}
        onClose={() => setSelectedProduct(null)}
        returnFocusTo={productTrigger}
        sourceLabel="Fashion collections"
      />
    </div>
  );
};

export default FashionCollections;
