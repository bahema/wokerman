import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
import { getFashionProductFitWhatsAppUrl, openFashionFitCheckout, openFashionLookWhatsApp } from "../utils/fashionWhatsApp";
import { formatFashionPrice } from "../utils/fashionPricing";
import { getFashionClientViewModel } from "../utils/fashionDraft";
import { getFashionBadgeClassName, getFashionPriceChipClassName } from "../utils/fashionBadge";
import { dedupeProductsById, normalizeFashionDisplayConfig, selectRelatedProducts } from "../utils/fashionProductDisplay";
import { buildFashionNavbarSocials } from "../utils/fashionNavbar";
import { useFashionPublishedSync } from "../hooks/useFashionPublishedSync";
import { useSiteNavLabels } from "../hooks/useSiteNavLabels";

type StyleSetKey = "office" | "weekend" | "evening" | "travel";

const FashionStyleNotes = () => {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [selectedProduct, setSelectedProduct] = useState<FashionProduct | null>(null);
  const [productTrigger, setProductTrigger] = useState<HTMLElement | null>(null);
  const [fashionViewModel, setFashionViewModel] = useState(() => getFashionClientViewModel());
  const navLabels = useSiteNavLabels();
  const styleNotesDraft = fashionViewModel.styleNotes;
  const [activeSet, setActiveSet] = useState<StyleSetKey>(styleNotesDraft.defaultSet);
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
  const resolveStyleSetProducts = (key: StyleSetKey) =>
    dedupeProductsById(
      (fashionViewModel.styleSetAssignments[key] ?? [])
        .map((productId) => allProducts.find((product) => product.id === productId))
        .filter((product): product is FashionProduct => Boolean(product))
    );
  const styleSets = useMemo(
    () =>
      ({
        office: {
          title: styleNotesDraft.setMeta.office.title,
          badge: styleNotesDraft.setMeta.office.badge,
          note: styleNotesDraft.setMeta.office.note,
          items: resolveStyleSetProducts("office")
        },
        weekend: {
          title: styleNotesDraft.setMeta.weekend.title,
          badge: styleNotesDraft.setMeta.weekend.badge,
          note: styleNotesDraft.setMeta.weekend.note,
          items: resolveStyleSetProducts("weekend")
        },
        evening: {
          title: styleNotesDraft.setMeta.evening.title,
          badge: styleNotesDraft.setMeta.evening.badge,
          note: styleNotesDraft.setMeta.evening.note,
          items: resolveStyleSetProducts("evening")
        },
        travel: {
          title: styleNotesDraft.setMeta.travel.title,
          badge: styleNotesDraft.setMeta.travel.badge,
          note: styleNotesDraft.setMeta.travel.note,
          items: resolveStyleSetProducts("travel")
        }
      }) satisfies Record<StyleSetKey, { title: string; badge: string; note: string; items: FashionProduct[] }>,
    [allProducts, fashionViewModel.styleSetAssignments, styleNotesDraft.setMeta]
  );
  const visibleSet = styleSets[activeSet];
  const leadProduct = visibleSet.items[0] ?? allProducts[0] ?? null;
  const pageProductIds = useMemo(() => visibleSet.items.map((item) => item.id), [visibleSet.items]);
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
    setActiveSet(styleNotesDraft.defaultSet);
  }, [styleNotesDraft.defaultSet]);

  useEffect(() => {
    const canonical = new URL(withBasePath("/fashion/style-notes"), `${window.location.origin}/`).toString();
    setStructuredData("fashion-style-notes", {
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: canonical,
      name: "AutoHub Fashion Style Notes"
    });
    return () => removeStructuredData("fashion-style-notes");
  }, []);

  const openProduct = (product: FashionProduct, trigger?: HTMLElement | null) => {
    setSelectedProduct(product);
    setProductTrigger(trigger ?? null);
  };

  const openSetOnWhatsApp = (title: string, items: FashionProduct[]) => {
    openFashionLookWhatsApp(title, items, "Fashion style notes");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbf7f1] text-[#191613] dark:bg-[#0e0c0a] dark:text-[#f7f1ea]" style={eventThemeVars}>
      <Navbar
        activeSection="fashion"
        theme={theme}
        onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        logoText="AutoHub"
        socials={navbarSocials}
        navLabels={navLabels}
      />
      <FashionSubnav currentPath="/fashion/style-notes" />

      <main className="overflow-x-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-black/8 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f6a46] dark:text-[#d6b798]">Style Notes</p>
            <h1 className="mt-4 break-words text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">{styleNotesDraft.pageTitle}</h1>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[#5f544a] dark:text-[#d5c8bc]">
              {styleNotesDraft.introNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            {styleNotesDraft.heroImage?.trim() ? (
              <div className="overflow-hidden rounded-[1.8rem] border border-black/8 bg-white/70 shadow-[0_24px_60px_-36px_rgba(48,35,18,0.35)] dark:border-white/10 dark:bg-white/5">
                <img
                  src={styleNotesDraft.heroImage}
                  alt="Style notes hero"
                  className="h-full w-full min-h-[16rem] object-cover"
                  onError={(event) => {
                    event.currentTarget.src = withBasePath("/logo.png");
                  }}
                />
              </div>
            ) : (
              <div className="rounded-[1.8rem] bg-[linear-gradient(140deg,#ead9c5,#c59972_58%,#7e6147)] p-6 shadow-[0_24px_60px_-36px_rgba(48,35,18,0.35)] dark:bg-[linear-gradient(140deg,#221a14,#5a432f_58%,#c7a17c)]" />
            )}
            <div className="grid gap-4">
              <div className="rounded-[1.6rem] border border-black/8 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-bold">Look Pairing</h2>
                <p className="mt-2 text-sm leading-6 text-[#5f544a] dark:text-[#d5c8bc]">{styleNotesDraft.panelIntro}</p>
              </div>
              <div className="rounded-[1.6rem] border border-black/8 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                {styleNotesDraft.panelImage?.trim() ? (
                  <div className="mb-3 overflow-hidden rounded-[1rem] border border-black/8 dark:border-white/10">
                    <img
                      src={styleNotesDraft.panelImage}
                      alt="Style notes panel"
                      className="h-36 w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = withBasePath("/logo.png");
                      }}
                    />
                  </div>
                ) : null}
                <h2 className="text-lg font-bold">Fit Direction</h2>
                <p className="mt-2 text-sm leading-6 text-[#5f544a] dark:text-[#d5c8bc]">This page can carry fit notes, fabric summaries, and editorial buying cues in a cleaner standalone format.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mx-auto mt-8 max-w-7xl space-y-6">
          <section className="rounded-[2rem] border border-black/8 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f6a46] dark:text-[#d6b798]">{styleNotesDraft.pairingEyebrow}</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl">{visibleSet.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f544a] dark:text-[#d5c8bc]">{visibleSet.note}</p>
              </div>
              <button
                type="button"
                onClick={() => openSetOnWhatsApp(visibleSet.title, visibleSet.items)}
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-[#1a1714] transition hover:bg-[#f6f1ea] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
              >
                {styleNotesDraft.lookCtaLabel}
              </button>
              <a
                href={leadProduct ? getFashionProductFitWhatsAppUrl(leadProduct, `Fashion style notes ${visibleSet.title}`) : "#"}
                onClick={(event) => {
                  if (!leadProduct) return;
                  event.preventDefault();
                  void openFashionFitCheckout(leadProduct, `Fashion style notes ${visibleSet.title}`);
                }}
                className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-[#1a1714] transition hover:bg-[#f6f1ea] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
              >
                {styleNotesDraft.fitCtaLabel}
              </a>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {(
                [
                  ["office", "Office"],
                  ["weekend", "Weekend"],
                  ["evening", "Evening"],
                  ["travel", "Travel"]
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSet(key)}
                  className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition ${
                    activeSet === key
                      ? "bg-[#1a1714] text-white dark:bg-[#f8f2eb] dark:text-[#17130f]"
                      : "border border-black/8 bg-white/70 text-[#1a1714] hover:bg-[#f6f1ea] dark:border-white/10 dark:bg-white/5 dark:text-[#f8f2eb] dark:hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className={`inline-flex items-center ${getFashionBadgeClassName(undefined, visibleSet.badge)}`}>
                {visibleSet.badge}
              </span>
            </div>

            <div className="mb-6 rounded-[1.6rem] border border-black/8 bg-[#f7f1e8] p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8f6a46] dark:text-[#d6b798]">{styleNotesDraft.helperTitle}</p>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5f544a] dark:text-[#d5c8bc]">
                    {visibleSet.title} stays effective because it combines {visibleSet.items[0]?.tone.toLowerCase()} structure,{" "}
                    {visibleSet.items[1]?.tone.toLowerCase()} balance, and one cleaner accent so the customer sees a full look instead of unrelated pieces.
                  </p>
                </div>
                <div className="grid gap-2 sm:min-w-[11rem]">
                  <div className="rounded-[1rem] border border-black/8 bg-white/80 px-4 py-3 text-sm font-semibold text-[#1a1714] dark:border-white/10 dark:bg-black/20 dark:text-[#f8f2eb]">
                    {leadProduct?.fit}
                  </div>
                  <div className="rounded-[1rem] border border-black/8 bg-white/80 px-4 py-3 text-sm font-semibold text-[#1a1714] dark:border-white/10 dark:bg-black/20 dark:text-[#f8f2eb]">
                    {leadProduct?.occasion}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
              {visibleSet.items.map((product, index) => (
                <article key={product.id} className="group w-full rounded-[1.5rem] border border-black/8 bg-[#fbf8f3] p-4 dark:border-white/10 dark:bg-[#171411]">
                  <FashionProductImage
                    product={product}
                    alt={product.name}
                    className={`w-full rounded-[1.1rem] transition duration-300 group-hover:scale-[1.02] ${index === 0 ? "h-56" : "h-40"}`}
                    fallbackClassName={product.palette}
                  />
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8d6c49] dark:text-[#d5b18b]">{product.collection}</p>
                  <h3 className="mt-2 break-words text-base font-bold sm:text-lg">{product.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5f544a] dark:text-[#d5c8bc]">{product.occasion}</p>
                  <div className="mt-3 rounded-[1rem] border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8d6c49] dark:text-[#d5b18b]">Pair with</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {visibleSet.items
                        .filter((item) => item.id !== product.id)
                        .slice(0, 2)
                        .map((item) => (
                          <span
                            key={`${product.id}-${item.id}`}
                            className="rounded-full border border-black/8 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f544a] dark:border-white/10 dark:bg-black/20 dark:text-[#d5c8bc]"
                          >
                            {item.name}
                          </span>
                        ))}
                    </div>
                  </div>
                  <span className={`mt-2 ${getFashionPriceChipClassName(product.badgeType, product.badge)}`}>{formatFashionPrice(product.price)}</span>
                  <button
                    type="button"
                    onClick={(event) => openProduct(product, event.currentTarget)}
                    className="mt-4 rounded-full bg-[#1a1714] px-4 py-2 text-sm font-semibold text-white dark:bg-[#f8f2eb] dark:text-[#17130f]"
                  >
                    View style item
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <BackToTop />
      <FashionProductModal
        product={selectedProduct}
        relatedProducts={relatedProducts}
        onClose={() => setSelectedProduct(null)}
        returnFocusTo={productTrigger}
        sourceLabel="Fashion style notes"
      />
    </div>
  );
};

export default FashionStyleNotes;
