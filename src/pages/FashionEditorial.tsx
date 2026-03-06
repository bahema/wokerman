import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Navbar from "../components/Navbar";
import BackToTop from "../components/BackToTop";
import FashionSubnav from "../components/FashionSubnav";
import FashionProductModal from "../components/FashionProductModal";
import FashionProductImage from "../components/FashionProductImage";
import HeroCarousel, { type HeroSlide } from "../components/HeroCarousel/HeroCarousel";
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
import { resolveFashionRouteTarget } from "../utils/fashionRouteTargets";
import { useFashionPublishedSync } from "../hooks/useFashionPublishedSync";
import { useSiteNavLabels } from "../hooks/useSiteNavLabels";

const createEditorialHeroImage = (start: string, end: string, label: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="58%" stop-color="${end}" />
          <stop offset="100%" stop-color="#0f0b10" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#g)" />
      <circle cx="1220" cy="200" r="220" fill="rgba(255,255,255,0.08)" />
      <circle cx="260" cy="720" r="280" fill="rgba(255,255,255,0.05)" />
      <text x="100" y="150" fill="rgba(255,255,255,0.64)" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" letter-spacing="10">${label}</text>
      <rect x="980" y="170" width="420" height="560" rx="28" fill="rgba(255,255,255,0.08)" />
      <rect x="180" y="520" width="420" height="170" rx="26" fill="rgba(0,0,0,0.16)" />
    </svg>`
  )}`;

const editorialSlides: HeroSlide[] = [
  {
    id: "editorial-slide-1",
    imageUrl: createEditorialHeroImage("#2a1d27", "#7f5a46", "CAMPAIGN"),
    source: "AutoHub Editorial",
    timeAgo: "Now",
    headline: "Editorial-led campaign stories that still move directly into affiliate conversion.",
    likes: 912,
    href: withBasePath("/fashion/editorial")
  },
  {
    id: "editorial-slide-2",
    imageUrl: createEditorialHeroImage("#1d171d", "#6b4f3f", "MONO EDIT"),
    source: "Style Desk",
    timeAgo: "1d",
    headline: "Sharper seasonal looks grouped into one story so the client can convert from one WhatsApp message.",
    likes: 744,
    href: withBasePath("/fashion/collections")
  },
  {
    id: "editorial-slide-3",
    imageUrl: createEditorialHeroImage("#22171b", "#8d6c55", "NIGHT TONE"),
    source: "Campaign Notes",
    timeAgo: "2d",
    headline: "Premium story blocks that make bundles feel intentional instead of random product placement.",
    likes: 806,
    href: withBasePath("/fashion/style-notes")
  }
];

const EditorialVisual = ({
  imageUrl,
  alt,
  className,
  fallbackClassName
}: {
  imageUrl?: string;
  alt: string;
  className: string;
  fallbackClassName: string;
}) =>
  imageUrl ? (
    <img
      src={imageUrl}
      alt={alt}
      className={`${className} object-cover`}
      onError={(event) => {
        event.currentTarget.src = withBasePath("/logo.png");
      }}
    />
  ) : (
    <div className={`${className} ${fallbackClassName}`} />
  );

const FashionEditorial = () => {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [selectedProduct, setSelectedProduct] = useState<FashionProduct | null>(null);
  const [productTrigger, setProductTrigger] = useState<HTMLElement | null>(null);
  const [fashionViewModel, setFashionViewModel] = useState(() => getFashionClientViewModel());
  const navLabels = useSiteNavLabels();
  const editorialDraft = fashionViewModel.editorial;
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
  const baseEditorialProducts = useMemo(
    () =>
      fashionViewModel.editorialStoryProductIds
        .map((productId) => allProducts.find((product) => product.id === productId))
        .filter((product): product is FashionProduct => Boolean(product)),
    [allProducts, fashionViewModel.editorialStoryProductIds]
  );
  const editorialHeroCards = useMemo(
    () =>
      fashionViewModel.editorialSlides.map((slide, index) => {
        const palettes = [
          ["#2a1d27", "#7f5a46"],
          ["#1d171d", "#6b4f3f"],
          ["#22171b", "#8d6c55"]
        ] as const;
        const [start, end] = palettes[index % palettes.length];
        const fallbackRoutes = ["/fashion/editorial", "/fashion/collections", "/fashion/style-notes"] as const;
        const targetRoute = resolveFashionRouteTarget(slide.primaryCtaHref, fallbackRoutes[index % fallbackRoutes.length]);
        return {
          id: slide.id,
          imageUrl: slide.imageUrl?.trim() || createEditorialHeroImage(start, end, slide.eyebrow.toUpperCase()),
          source: slide.badge?.trim() || slide.eyebrow,
          timeAgo: index === 0 ? "Now" : `${index}d`,
          headline: slide.headline,
          likes: 740 + index * 80,
          href: withBasePath(targetRoute)
        };
      }),
    [fashionViewModel]
  );
  const baseChapterTwoProducts = useMemo(
    () =>
      fashionViewModel.editorialChapterProductIds
        .map((productId) => allProducts.find((product) => product.id === productId))
        .filter((product): product is FashionProduct => Boolean(product)),
    [allProducts, fashionViewModel.editorialChapterProductIds]
  );
  const baseRelatedStoryProducts = useMemo(
    () =>
      fashionViewModel.editorialRelatedProductIds
        .map((productId) => allProducts.find((product) => product.id === productId))
        .filter((product): product is FashionProduct => Boolean(product)),
    [allProducts, fashionViewModel.editorialRelatedProductIds]
  );
  const editorialProducts = useMemo(() => dedupeProductsById(baseEditorialProducts), [baseEditorialProducts]);
  const chapterTwoProducts = useMemo(() => {
    const deduped = dedupeProductsById(baseChapterTwoProducts);
    if (!displayConfig.enforceUniquePerPage) return deduped;
    const storyIds = new Set(editorialProducts.map((product) => product.id));
    return deduped.filter((product) => !storyIds.has(product.id));
  }, [baseChapterTwoProducts, displayConfig.enforceUniquePerPage, editorialProducts]);
  const relatedStoryProducts = useMemo(() => {
    const deduped = dedupeProductsById(baseRelatedStoryProducts);
    if (!displayConfig.enforceUniquePerPage) return deduped;
    const used = new Set([...editorialProducts, ...chapterTwoProducts].map((product) => product.id));
    return deduped.filter((product) => !used.has(product.id));
  }, [baseRelatedStoryProducts, chapterTwoProducts, displayConfig.enforceUniquePerPage, editorialProducts]);
  const pageProductIds = useMemo(
    () => dedupeProductsById([...editorialProducts, ...chapterTwoProducts, ...relatedStoryProducts]).map((product) => product.id),
    [chapterTwoProducts, editorialProducts, relatedStoryProducts]
  );
  const editorialStory = useMemo(() => {
    if (editorialProducts.length === 0) return null;
    return {
      title: editorialDraft.storyTitle,
      note: editorialDraft.storyNote,
      hero: editorialProducts[0],
      companions: editorialProducts.slice(1)
    };
  }, [editorialDraft.storyNote, editorialDraft.storyTitle, editorialProducts]);
  const relatedProducts = useMemo(
    () =>
      selectRelatedProducts({
        selectedProduct,
        allProducts,
        excludeIds: pageProductIds,
        limit: displayConfig.relatedProductLimit
      }),
    [allProducts, displayConfig.relatedProductLimit, pageProductIds, selectedProduct]
  );

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  useFashionPublishedSync(setFashionViewModel);

  useEffect(() => {
    const canonical = new URL(withBasePath("/fashion/editorial"), `${window.location.origin}/`).toString();
    setStructuredData("fashion-editorial", {
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: canonical,
      name: "AutoHub Fashion Editorial Edit"
    });
    return () => removeStructuredData("fashion-editorial");
  }, []);

  const openProduct = (product: FashionProduct, trigger?: HTMLElement | null) => {
    setSelectedProduct(product);
    setProductTrigger(trigger ?? null);
  };

  const openEditorialStoryOnWhatsApp = () => {
    if (!editorialStory) return;
    openFashionStoryWhatsApp(editorialStory.title, editorialProducts, "Fashion editorial story");
  };

  const openChapterTwoOnWhatsApp = () => {
    if (chapterTwoProducts.length === 0) return;
    openFashionStoryWhatsApp(editorialDraft.chapterTwoFeatureTitle, chapterTwoProducts, "Fashion editorial chapter two");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#120f12] text-[#f7f2ec]" style={eventThemeVars}>
      <Navbar
        activeSection="fashion"
        theme={theme}
        onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        logoText="AutoHub"
        socials={navbarSocials}
        navLabels={navLabels}
      />
      <FashionSubnav currentPath="/fashion/editorial" />

      <main className="overflow-x-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 max-w-7xl rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6b798]">{editorialDraft.sliderTitle}</p>
              <h1 className="mt-2 break-words text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">{editorialDraft.pageTitle}</h1>
            </div>
          </div>
          <HeroCarousel slides={editorialHeroCards.length > 0 ? editorialHeroCards : editorialSlides} autoAdvanceMs={6400} likesScope="editorial" />
        </div>

        <div className="mx-auto max-w-7xl rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,#181217,#2a1d27_45%,#604638)] p-6 shadow-[0_35px_100px_-48px_rgba(0,0,0,0.85)] md:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <EditorialVisual
                imageUrl={editorialDraft.introPrimaryImage}
                alt="Editorial intro visual"
                className="h-56 rounded-[1.6rem] sm:h-auto"
                fallbackClassName="bg-[linear-gradient(135deg,#84604a,#e4c3a7)]"
              />
              <div className="grid gap-4">
                <EditorialVisual
                  imageUrl={editorialDraft.introSecondaryImage}
                  alt="Editorial intro secondary visual"
                  className="h-28 rounded-[1.4rem]"
                  fallbackClassName="bg-[linear-gradient(135deg,#51382d,#caa27f)]"
                />
                <EditorialVisual
                  imageUrl={editorialDraft.introTertiaryImage}
                  alt="Editorial intro tertiary visual"
                  className="h-28 rounded-[1.4rem]"
                  fallbackClassName="bg-[linear-gradient(135deg,#2b2322,#725847)]"
                />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6b798]">{editorialDraft.introEyebrow}</p>
              <h1 className="mt-4 break-words text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">{editorialDraft.introHeadline}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72">{editorialDraft.introNote}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] bg-white/5 p-6 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6b798]">{editorialDraft.campaignNotesTitle}</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-white/75">
              <p>{editorialDraft.campaignNotesNoteOne}</p>
              <p>{editorialDraft.campaignNotesNoteTwo}</p>
            </div>
          </section>
          <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <EditorialVisual
              imageUrl={editorialDraft.campaignNotesImage}
              alt="Campaign notes visual"
              className="h-72 rounded-[1.6rem]"
              fallbackClassName="bg-[linear-gradient(140deg,#2f2420,#855f46_58%,#f0d2b8)]"
            />
          </section>
        </div>

        <div className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(0,0,0,0.16))] p-6 backdrop-blur md:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
              <div className="grid h-full gap-4 sm:grid-cols-[1.05fr_0.95fr]">
                <EditorialVisual
                  imageUrl={editorialDraft.chapterTwoPrimaryImage}
                  alt="Chapter two visual"
                  className="min-h-[20rem] rounded-[1.4rem]"
                  fallbackClassName="bg-[linear-gradient(140deg,#3a2a27,#9a7155_56%,#f3d5b9)]"
                />
                <div className="grid gap-4">
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d6b798]">{editorialDraft.chapterTwoTitle}</p>
                    <p className="mt-2 text-base font-black tracking-[-0.02em]">{editorialDraft.chapterTwoFeatureTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">{editorialDraft.chapterTwoFeatureNote}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <EditorialVisual
                      imageUrl={editorialDraft.chapterTwoSecondaryImage}
                      alt="Chapter two supporting visual one"
                      className="rounded-[1rem] min-h-[8rem]"
                      fallbackClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))]"
                    />
                    <EditorialVisual
                      imageUrl={editorialDraft.chapterTwoTertiaryImage}
                      alt="Chapter two supporting visual two"
                      className="rounded-[1rem] min-h-[8rem]"
                      fallbackClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))]"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col justify-center rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6b798]">Story chapter</p>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{editorialDraft.chapterStoryTitle}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/74">{editorialDraft.chapterStoryDescription}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Focus</p>
                  <p className="mt-2 text-sm font-semibold text-white/86">{editorialDraft.chapterStoryFocusLabel}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Goal</p>
                  <p className="mt-2 text-sm font-semibold text-white/86">{editorialDraft.chapterStoryGoalLabel}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">Action</p>
                  <p className="mt-2 text-sm font-semibold text-white/86">{editorialDraft.chapterStoryActionLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={openChapterTwoOnWhatsApp}
                className="mt-6 inline-flex w-fit rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                {editorialDraft.chapterCtaLabel}
              </button>
            </section>
          </div>
        </div>

        {relatedStoryProducts.length > 0 ? (
          <div className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-white/10 bg-black/15 p-6 backdrop-blur">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6b798]">{editorialDraft.relatedStripTitle}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{editorialDraft.relatedStripSubtitle}</h2>
              </div>
            </div>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
              {relatedStoryProducts.map((product) => (
                <article key={product.id} className="group w-full rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <FashionProductImage product={product} alt={product.name} className="h-40 w-full rounded-[1.1rem] transition duration-300 group-hover:scale-[1.02]" fallbackClassName={product.palette} />
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d6b798]">{product.collection}</p>
                  <h3 className="mt-2 break-words text-lg font-bold tracking-[-0.03em]">{product.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/72">{product.note}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className={getFashionPriceChipClassName(product.badgeType, product.badge)}>{formatFashionPrice(product.price)}</span>
                    <button
                      type="button"
                      onClick={(event) => openProduct(product, event.currentTarget)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
                    >
                      Open story piece
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(0,0,0,0.22))] p-6 backdrop-blur md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
              <div className="grid h-full gap-4 sm:grid-cols-[0.95fr_1.05fr]">
                <div className="grid gap-4">
                  <EditorialVisual
                    imageUrl={editorialDraft.finalChapterSecondaryImage}
                    alt="Final chapter secondary visual"
                    className="min-h-[9rem] rounded-[1.2rem]"
                    fallbackClassName="bg-[linear-gradient(140deg,#3a2d2a,#8f6951_56%,#f0cfb3)]"
                  />
                  <EditorialVisual
                    imageUrl={editorialDraft.finalChapterTertiaryImage}
                    alt="Final chapter tertiary visual"
                    className="min-h-[9rem] rounded-[1.2rem]"
                    fallbackClassName="bg-[linear-gradient(140deg,#1d1719,#5c4335_56%,#af8462)]"
                  />
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d6b798]">{editorialDraft.chapterThreeTitle}</p>
                  <p className="mt-2 text-lg font-black tracking-[-0.02em]">{editorialDraft.finalChapterFeatureTitle}</p>
                  <p className="mt-3 text-sm leading-6 text-white/72">{editorialDraft.finalChapterFeatureNote}</p>
                  <EditorialVisual
                    imageUrl={editorialDraft.finalChapterPrimaryImage}
                    alt="Final chapter primary visual"
                    className="mt-4 h-28 w-full rounded-[1rem]"
                    fallbackClassName="bg-[linear-gradient(140deg,#2a2223,#6c5141_56%,#d0ab8f)]"
                  />
                </div>
              </div>
            </section>
            <section className="flex flex-col justify-center rounded-[1.8rem] border border-white/10 bg-black/20 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6b798]">Final chapter</p>
              <h2 className="mt-4 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{editorialDraft.finalChapterTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-white/74">{editorialDraft.finalChapterDescription}</p>
            </section>
          </div>
        </div>

        {editorialStory ? (
          <div className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6b798]">{editorialDraft.shopStoryEyebrow}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{editorialDraft.shopStoryTitle}</h2>
              </div>
              <button
                type="button"
                onClick={openEditorialStoryOnWhatsApp}
                className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                {editorialDraft.storyCtaLabel}
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
                <FashionProductImage product={editorialStory.hero} alt={editorialStory.hero.name} className="h-72 w-full rounded-[1.4rem]" fallbackClassName={editorialStory.hero.palette} />
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d6b798]">{editorialStory.hero.collection}</p>
                    <h3 className="mt-2 break-words text-xl font-black tracking-[-0.03em] sm:text-2xl">{editorialStory.hero.name}</h3>
                  </div>
                  {editorialStory.hero.badge ? (
                    <span className={getFashionBadgeClassName(editorialStory.hero.badgeType, editorialStory.hero.badge)}>
                      {editorialStory.hero.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-7 text-white/74">{editorialStory.note}</p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className={getFashionPriceChipClassName(editorialStory.hero.badgeType, editorialStory.hero.badge)}>{formatFashionPrice(editorialStory.hero.price)}</span>
                  <button
                    type="button"
                    onClick={(event) => openProduct(editorialStory.hero, event.currentTarget)}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Open hero piece
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {editorialStory.companions.map((item) => (
                  <article key={item.id} className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:grid-cols-[7.5rem_1fr]">
                    <FashionProductImage product={item} alt={item.name} className="h-28 w-full rounded-[1rem] sm:h-full" fallbackClassName={item.palette} />
                    <div className="flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d6b798]">{item.collection}</p>
                        <h4 className="mt-1 break-words text-base font-bold tracking-[-0.02em]">{item.name}</h4>
                        <p className="mt-2 text-sm leading-6 text-white/72">{item.note}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className={getFashionPriceChipClassName(item.badgeType, item.badge)}>{formatFashionPrice(item.price)}</span>
                        <button
                          type="button"
                          onClick={(event) => openProduct(item, event.currentTarget)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
                        >
                          View piece
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/15 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d6b798]">Story total</p>
                  <p className="mt-3 text-base font-black">{formatFashionPrice(editorialProducts.reduce((sum, item) => sum + item.price, 0))}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6b798]">Seen in this edit</p>
              <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">Campaign pieces linked directly to WhatsApp conversion.</h2>
            </div>
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
            {editorialProducts.map((product) => (
              <article key={product.id} className="group w-full rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <FashionProductImage product={product} alt={product.name} className="h-44 w-full rounded-[1.2rem] transition duration-300 group-hover:scale-[1.02]" fallbackClassName={product.palette} />
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d6b798]">{product.collection}</p>
                <h3 className="mt-2 break-words text-xl font-bold">{product.name}</h3>
                <p className="mt-2 text-sm leading-6 text-white/72">{product.note}</p>
                <button
                  type="button"
                  onClick={(event) => openProduct(product, event.currentTarget)}
                  className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1a1714]"
                >
                  Open product
                </button>
              </article>
            ))}
          </div>
        </div>
      </main>

      <BackToTop />
      <FashionProductModal
        product={selectedProduct}
        relatedProducts={relatedProducts}
        onClose={() => setSelectedProduct(null)}
        returnFocusTo={productTrigger}
        sourceLabel="Fashion editorial"
      />
    </div>
  );
};

export default FashionEditorial;
