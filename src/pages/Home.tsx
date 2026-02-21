import { useEffect, useRef, useState, type CSSProperties } from "react";
import BackToTop from "../components/BackToTop";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import QuickGrabsModal from "../components/QuickGrabsModal";
import SectionHeader from "../components/SectionHeader";
import type { Product, ProductSections, SiteContent } from "../../shared/siteTypes";
import { smoothScrollToId } from "../utils/smoothScroll";
import { getInitialTheme, type Theme, updateTheme } from "../utils/theme";
import { useProductFilters } from "../utils/useProductFilters";
import { useSectionObserver } from "../utils/useSectionObserver";
import { getDraftContentAsync, getPublishedContentAsync, getSiteMetaAsync } from "../utils/adminStorage";
import { trackAnalyticsEvent } from "../utils/analytics";
import { removeStructuredData, setStructuredData } from "../utils/seo";
import { withBasePath } from "../utils/basePath";
import { getEventThemeCssVars } from "../utils/eventTheme";
import { OPEN_COOKIE_SETTINGS_EVENT } from "../utils/cookieConsent";
import { useI18n } from "../i18n/provider";

type HomeProps = {
  initialSection?: "forex" | "betting" | "software" | "social";
};

const fallbackProductSections: ProductSections = {
  forex: { title: "Forex New Items", description: "Freshly released forex tools with strong ratings and practical execution workflows." },
  betting: { title: "Betting System Products", description: "High-performing betting tools and systems." },
  software: { title: "New Released Software", description: "Browse newly released software products." },
  social: { title: "Social Media Automation", description: "Automation-focused social products for scheduling, response workflows, and campaign optimization." }
};

const fallbackHomeUi: NonNullable<SiteContent["homeUi"]> = {
  heroEyebrow: "Smart automation for modern operators",
  heroQuickGrabsLabel: "Quick Grabs",
  performanceSnapshotTitle: "Performance Snapshot",
  performanceSnapshotSubtext: "Products tuned for speed, confidence, and measurable outcomes.",
  adsectionMan: {
    gadgets: {
      sectionTitle: "Newer Gadgets",
      price: 79,
      priceBadge: "$79",
      imageUrl: "/logo.png",
      badgePrimary: "New",
      badgeSecondary: "Coming Soon",
      overlayTitle: "Gadget Drop",
      overlayText: "Tap in early for fresh utility tools.",
      buttonLabel: "Check Fresh Drop",
      buttonTarget: "forex",
      scrollHint: "Scroll"
    },
    ai: {
      sectionTitle: "New AI Tools",
      price: 99,
      priceBadge: "$99",
      imageUrl: "/logo.png",
      badgePrimary: "New",
      badgeSecondary: "Coming Soon",
      overlayTitle: "AI Update",
      overlayText: "Discover the next wave of smart tools.",
      buttonLabel: "Check Fresh AI",
      buttonTarget: "software",
      scrollHint: "Scroll"
    }
  },
  industriesHeading: "Industries We Work With",
  industriesEmptyMessage: "No industries published yet. Add industries from Admin to show them here.",
  productCardNewBadgeLabel: "NEW",
  productCardNewReleaseLabel: "New release",
  productCardKeyFeaturesSuffix: "key features",
  productCardCheckoutLabel: "Proceed to Checkout",
  productCardMoreInfoLabel: "Get More Info",
  productCardAffiliateDisclosure: "Affiliate disclosure: we may earn a commission if you buy through this link, at no extra cost to you."
};

const fallbackSiteContent: SiteContent = {
  branding: { logoText: "AutoHub", defaultTheme: "system", eventTheme: "none" },
  socials: { facebookUrl: "https://facebook.com", whatsappUrl: "https://wa.me/", other: [] },
  hero: {
    headline: "Discover next-gen tools for Forex, Betting, and Social growth.",
    subtext: "Curated products with fast onboarding, premium UX, and trusted workflows to help you execute faster and scale smarter.",
    ctaPrimary: { label: "Explore Forex Tools", target: "forex" },
    ctaSecondary: { label: "See New Releases", target: "betting" },
    stats: [
      { label: "Active users", value: "12.4k" },
      { label: "Avg. rating", value: "4.8" },
      { label: "Live tools", value: "24" }
    ]
  },
  homeUi: fallbackHomeUi,
  testimonials: [],
  products: { forex: [], betting: [], software: [], social: [] },
  productSections: fallbackProductSections,
  industries: [],
  footer: { note: "Premium product discovery for automation-first digital operators.", copyright: `© ${new Date().getFullYear()} AutoHub. All rights reserved.` }
};

const loadDefaultSiteContent = async () => {
  const { defaultSiteContent } = await import("../data/siteData");
  return defaultSiteContent;
};

type AdSectionBox = NonNullable<SiteContent["homeUi"]>["adsectionMan"]["gadgets"];
const resolveAdSectionPriceBadge = (section: AdSectionBox) => {
  const custom = (section.priceBadge ?? "").trim();
  if (custom) return custom;
  if (typeof section.price === "number" && Number.isFinite(section.price) && section.price > 0) {
    return `$${Math.round(section.price)}`;
  }
  return "";
};

const Home = (_props: HomeProps) => {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [content, setContent] = useState<SiteContent>(fallbackSiteContent);
  const [siteUpdatedAt, setSiteUpdatedAt] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const activeSection = useSectionObserver(["forex", "betting", "software", "social"]);
  const footerYear = new Date().getFullYear();
  const industriesScrollRef = useRef<HTMLDivElement>(null);
  const [industriesScrollPaused, setIndustriesScrollPaused] = useState(false);

  const forex = useProductFilters(content.products.forex);
  const betting = useProductFilters(content.products.betting);
  const software = useProductFilters(content.products.software);
  const social = useProductFilters(content.products.social);

  const [infoProduct, setInfoProduct] = useState<Product | null>(null);
  const [quickGrabsOpen, setQuickGrabsOpen] = useState(false);
  const [infoTrigger, setInfoTrigger] = useState<HTMLElement | null>(null);
  const [quickGrabsTrigger, setQuickGrabsTrigger] = useState<HTMLElement | null>(null);
  const lastTrackedSection = useRef<string>("");
  const productSections = content.productSections ?? fallbackProductSections;
  const homeUi = {
    ...fallbackHomeUi,
    ...(content.homeUi ?? {}),
    adsectionMan: {
      ...fallbackHomeUi.adsectionMan,
      ...(content.homeUi?.adsectionMan ?? {}),
      gadgets: {
        ...fallbackHomeUi.adsectionMan.gadgets,
        ...(content.homeUi?.adsectionMan?.gadgets ?? {})
      },
      ai: {
        ...fallbackHomeUi.adsectionMan.ai,
        ...(content.homeUi?.adsectionMan?.ai ?? {})
      }
    }
  };

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const metaPromise = getSiteMetaAsync();
        const params = new URLSearchParams(window.location.search);
        let nextContent: SiteContent | null = null;
        if (params.get("preview") === "draft") {
          const draft = await getDraftContentAsync();
          if (!cancelled && draft) {
            nextContent = draft;
          }
        }
        if (!nextContent) {
          const published = await getPublishedContentAsync();
          nextContent = published;
        }
        const meta = await metaPromise;
        if (!cancelled) {
          setContent(nextContent);
          setSiteUpdatedAt(meta?.updatedAt ?? null);
        }
      } catch {
        if (!cancelled) {
          setContent(await loadDefaultSiteContent());
          setSiteUpdatedAt(null);
        }
      } finally {
        if (!cancelled) setLoadingContent(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const meta = await getSiteMetaAsync();
          if (!meta?.updatedAt || cancelled || meta.updatedAt === siteUpdatedAt) return;
          const params = new URLSearchParams(window.location.search);
          const isDraftPreview = params.get("preview") === "draft";
          const draft = isDraftPreview ? await getDraftContentAsync() : null;
          const nextContent = draft ?? (await getPublishedContentAsync());
          if (!cancelled) {
            setContent(nextContent);
            setSiteUpdatedAt(meta.updatedAt);
          }
        } catch {
          // Keep current content on polling failures.
        }
      })();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [siteUpdatedAt]);

  useEffect(() => {
    if (loadingContent) return;
    const items = document.querySelectorAll<HTMLElement>(".reveal");
    if (typeof window.IntersectionObserver !== "function") {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [loadingContent]);

  useEffect(() => {
    if (!activeSection || activeSection === lastTrackedSection.current) return;
    lastTrackedSection.current = activeSection;
    trackAnalyticsEvent("section_view", { sectionId: activeSection });
  }, [activeSection]);

  useEffect(() => {
    if (!infoProduct) return;
    trackAnalyticsEvent("product_modal_open", {
      productId: infoProduct.id,
      category: infoProduct.category
    });
  }, [infoProduct]);

  useEffect(() => {
    const el = industriesScrollRef.current;
    if (!el || content.industries.length < 2) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    let rafId = 0;
    let last = performance.now();
    const speedPxPerMs = window.innerWidth < 640 ? 0.028 : 0.04;

    el.scrollLeft = 0;

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (!industriesScrollPaused) {
        const loopWidth = el.scrollWidth / 2;
        if (loopWidth > 0) {
          const next = el.scrollLeft + delta * speedPxPerMs;
          el.scrollLeft = next >= loopWidth ? next - loopWidth : next;
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [content.industries.length, industriesScrollPaused]);

  useEffect(() => {
    const origin = window.location.origin;
    const affiliateDisclosureUrl = new URL(withBasePath("/affiliate-disclosure"), `${origin}/`).toString();
    const productLists = [
      { id: "forex", name: "Forex", items: content.products.forex },
      { id: "betting", name: "Betting", items: content.products.betting },
      { id: "software", name: "Software", items: content.products.software },
      { id: "social", name: "Social", items: content.products.social }
    ];

    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${origin}/#organization`,
          name: content.branding.logoText || "AutoHub",
          url: `${origin}/`,
          sameAs: [content.socials.facebookUrl, content.socials.whatsappUrl, ...(content.socials.other ?? []).map((social) => social.url)].filter(Boolean),
          subjectOf: {
            "@type": "WebPage",
            "@id": `${affiliateDisclosureUrl}#page`,
            url: affiliateDisclosureUrl,
            name: "Affiliate Disclosure"
          }
        },
        {
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          name: content.branding.logoText || "AutoHub",
          url: `${origin}/`,
          inLanguage: "en",
          publishingPrinciples: affiliateDisclosureUrl
        },
        ...productLists.map((list) => ({
          "@type": "CollectionPage",
          "@id": `${origin}/${list.id}#collection`,
          url: `${origin}/${list.id}`,
          name: `${list.name} Products`,
          isPartOf: { "@id": `${origin}/#website` },
          hasPart: list.items.slice(0, 12).map((item) => ({
            "@type": "Product",
            name: item.title,
            description: item.shortDescription,
            category: item.category,
            image: item.imageUrl || undefined,
            offers: {
              "@type": "Offer",
              url: new URL(`${withBasePath(`/${list.id}`)}?product=${encodeURIComponent(item.id)}`, `${origin}/`).toString(),
              priceCurrency: "USD",
              availability: "https://schema.org/InStock"
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: item.rating.toFixed(1),
              reviewCount: "1"
            }
          }))
        }))
      ]
    };

    setStructuredData("site-graph", graph);
    return () => removeStructuredData("site-graph");
  }, [content]);

  const runTarget = (target: string) => {
    if (target.startsWith("http")) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }
    smoothScrollToId(target.replace("#", ""));
  };

  const resolveImage = (input: string) => (input.startsWith("http") ? input : withBasePath(input));

  const industriesForTrack =
    content.industries.length > 1 ? [...content.industries, ...content.industries] : content.industries;

  const renderProductGrid = (products: Product[], sourceCount: number) => {
    if (sourceCount === 0) {
      return (
        <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No products are published in this section yet. Add products from Admin to show them here.
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No products match your current search/filter.
        </div>
      );
    }

    return products.map((product) => (
      <ProductCard
        key={product.id}
        product={product}
        labels={{
          newBadgeLabel: homeUi.productCardNewBadgeLabel,
          newReleaseLabel: homeUi.productCardNewReleaseLabel,
          keyFeaturesSuffix: homeUi.productCardKeyFeaturesSuffix,
          checkoutLabel: homeUi.productCardCheckoutLabel,
          moreInfoLabel: homeUi.productCardMoreInfoLabel,
          affiliateDisclosure: homeUi.productCardAffiliateDisclosure
        }}
        onCheckout={(item, trigger) => {
          trackAnalyticsEvent("product_link_click", {
            productId: item.id,
            category: item.category,
            source: "product_card",
            action: "checkout_button"
          });
          void trigger;
          window.open(item.checkoutLink, "_blank", "noopener,noreferrer");
        }}
        onMoreInfo={(item, trigger) => {
          trackAnalyticsEvent("product_more_info_click", {
            productId: item.id,
            category: item.category,
            source: "product_card"
          });
          setInfoProduct(item);
          setInfoTrigger(trigger);
        }}
      />
    ));
  };

  if (loadingContent) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-10 text-sm text-slate-600 dark:text-slate-300">Loading content...</div>
      </div>
    );
  }

  const eventTheme = content.branding.eventTheme ?? "none";
  const eventThemeActive = eventTheme !== "none";
  const eventThemeVars = getEventThemeCssVars(eventTheme, theme) as CSSProperties;

  return (
    <div
      className={`min-h-screen overflow-x-hidden text-slate-900 dark:text-slate-100 ${
        eventThemeActive ? "event-page" : "bg-slate-50 dark:bg-slate-950"
      }`}
      style={eventThemeVars}
    >
      <Navbar
        activeSection={activeSection}
        theme={theme}
        onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        logoText={content.branding.logoText}
        socials={content.socials}
        eventThemeActive={eventThemeActive}
      />

      <main className="overflow-x-hidden">
        <section className="relative overflow-hidden py-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50 via-sky-50 to-slate-50 dark:from-transparent dark:via-transparent dark:to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative grid items-center gap-8 lg:grid-cols-2">
              <div className="reveal min-w-0 space-y-6">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${eventThemeActive ? "event-chip" : "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300"}`}>
                  {homeUi.heroEyebrow}
                </span>
                <h1 className="break-words text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">{content.hero.headline}</h1>
                <p className="max-w-xl break-words text-base text-slate-600 dark:text-slate-200">{content.hero.subtext}</p>
                <div className="flex flex-col items-start gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => runTarget(content.hero.ctaPrimary.target)}
                    className={`rounded-xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                      eventThemeActive ? "event-btn-primary hover:brightness-110" : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    {content.hero.ctaPrimary.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => runTarget(content.hero.ctaSecondary.target)}
                    className={`rounded-xl border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                      eventThemeActive
                        ? "event-btn-secondary hover:brightness-95"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {content.hero.ctaSecondary.label}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    setQuickGrabsTrigger(event.currentTarget);
                    setQuickGrabsOpen(true);
                  }}
                  className={`inline-flex w-fit max-w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 ${
                    eventThemeActive ? "event-btn-primary hover:brightness-110" : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {homeUi.heroQuickGrabsLabel}
                </button>

                <div className="min-w-0 max-w-full rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-800 p-6 text-white shadow-[0_24px_45px_-26px_rgba(30,64,175,0.8)] dark:border-slate-700 dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
                  <h3 className="text-lg font-semibold">{homeUi.performanceSnapshotTitle}</h3>
                  <p className="mt-1 text-sm text-slate-100">{homeUi.performanceSnapshotSubtext}</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {content.hero.stats.map((stat) => (
                      <div key={stat.label} className="min-w-0 rounded-xl bg-white/15 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] dark:shadow-none">
                        <p className="text-xs uppercase tracking-wide text-slate-100">{stat.label}</p>
                        <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="reveal min-w-0 space-y-4">
                <div
                  className={`rounded-3xl border p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.45)] ${
                    eventThemeActive ? "event-hero-surface" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{homeUi.adsectionMan.gadgets.sectionTitle}</h3>
                    {resolveAdSectionPriceBadge(homeUi.adsectionMan.gadgets) ? (
                      <span className="shrink-0 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                        {resolveAdSectionPriceBadge(homeUi.adsectionMan.gadgets)}
                      </span>
                    ) : null}
                  </div>
                  <div className={`relative mt-4 overflow-hidden rounded-2xl border ${eventThemeActive ? "event-ad-frame" : "border-slate-200 dark:border-slate-700"}`}>
                    <div
                      className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] shadow-lg ${
                        eventThemeActive ? "event-ad-badge" : "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white"
                      }`}
                    >
                      <span className="rounded-full bg-white/20 px-1.5 py-0.5 leading-none">{homeUi.adsectionMan.gadgets.badgePrimary}</span>
                      <span className="leading-none">{homeUi.adsectionMan.gadgets.badgeSecondary}</span>
                    </div>
                    <div
                      className={`absolute bottom-3 left-3 z-10 flex min-h-[120px] min-w-[160px] max-w-[70%] flex-col overflow-hidden rounded-2xl border p-3 backdrop-blur-md ${
                        eventThemeActive ? "event-ad-overlay" : "border-white/20 bg-slate-950/55 text-white"
                      }`}
                    >
                      <span className="mb-2 inline-flex w-fit rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-100 sm:hidden">
                        {homeUi.adsectionMan.gadgets.scrollHint}
                      </span>
                      <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-none">
                        <p className={`text-sm font-bold tracking-tight ${eventThemeActive ? "event-ad-overlay-title" : ""}`}>{homeUi.adsectionMan.gadgets.overlayTitle}</p>
                        <p className={`mt-1 text-xs ${eventThemeActive ? "event-ad-overlay-text" : "text-slate-200"}`}>{homeUi.adsectionMan.gadgets.overlayText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => runTarget(homeUi.adsectionMan.gadgets.buttonTarget)}
                        className={`mt-2 inline-flex w-fit shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                          eventThemeActive ? "event-ad-overlay-btn hover:brightness-110" : "bg-white/15 text-white hover:bg-white/25"
                        }`}
                      >
                        {homeUi.adsectionMan.gadgets.buttonLabel}
                      </button>
                    </div>
                    <img
                      src={resolveImage(homeUi.adsectionMan.gadgets.imageUrl)}
                      alt="Newer gadgets preview"
                      className="h-52 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
                <div
                  className={`rounded-3xl border p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.45)] ${
                    eventThemeActive ? "event-hero-surface" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{homeUi.adsectionMan.ai.sectionTitle}</h3>
                    {resolveAdSectionPriceBadge(homeUi.adsectionMan.ai) ? (
                      <span className="shrink-0 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                        {resolveAdSectionPriceBadge(homeUi.adsectionMan.ai)}
                      </span>
                    ) : null}
                  </div>
                  <div className={`relative mt-4 overflow-hidden rounded-2xl border ${eventThemeActive ? "event-ad-frame" : "border-slate-200 dark:border-slate-700"}`}>
                    <div
                      className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] shadow-lg ${
                        eventThemeActive ? "event-ad-badge" : "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white"
                      }`}
                    >
                      <span className="rounded-full bg-white/20 px-1.5 py-0.5 leading-none">{homeUi.adsectionMan.ai.badgePrimary}</span>
                      <span className="leading-none">{homeUi.adsectionMan.ai.badgeSecondary}</span>
                    </div>
                    <div
                      className={`absolute bottom-3 left-3 z-10 flex min-h-[120px] min-w-[160px] max-w-[70%] flex-col overflow-hidden rounded-2xl border p-3 backdrop-blur-md ${
                        eventThemeActive ? "event-ad-overlay" : "border-white/20 bg-slate-950/55 text-white"
                      }`}
                    >
                      <span className="mb-2 inline-flex w-fit rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-100 sm:hidden">
                        {homeUi.adsectionMan.ai.scrollHint}
                      </span>
                      <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-none">
                        <p className={`text-sm font-bold tracking-tight ${eventThemeActive ? "event-ad-overlay-title" : ""}`}>{homeUi.adsectionMan.ai.overlayTitle}</p>
                        <p className={`mt-1 text-xs ${eventThemeActive ? "event-ad-overlay-text" : "text-slate-200"}`}>{homeUi.adsectionMan.ai.overlayText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => runTarget(homeUi.adsectionMan.ai.buttonTarget)}
                        className={`mt-2 inline-flex w-fit shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                          eventThemeActive ? "event-ad-overlay-btn hover:brightness-110" : "bg-white/15 text-white hover:bg-white/25"
                        }`}
                      >
                        {homeUi.adsectionMan.ai.buttonLabel}
                      </button>
                    </div>
                    <img
                      src={resolveImage(homeUi.adsectionMan.ai.imageUrl)}
                      alt="New AI tools preview"
                      className="h-52 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="reveal mt-10 grid gap-4 md:grid-cols-3">
              {content.testimonials.map((item) => (
                <article
                  key={item.id}
                  className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_35px_-18px_rgba(30,64,175,0.25)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-sm dark:hover:shadow-md sm:grid-cols-[110px,1fr]"
                >
                  <div className="flex flex-col items-start gap-2 border-b border-slate-200 pb-3 dark:border-slate-700 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={item.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white">
                        {item.name
                          .split(" ")
                          .map((part) => part.charAt(0))
                          .join("")
                          .slice(0, 2)}
                      </div>
                    )}
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      Testimonial
                    </span>
                    <div className="flex items-center gap-0.5 text-xs text-amber-500" aria-label={`Rated ${item.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <span key={`${item.id}-star-${idx}`}>{idx < Math.round(item.rating) ? "★" : "☆"}</span>
                      ))}
                    </div>
                  </div>
                  <blockquote className="min-w-0 break-words flex flex-col justify-between">
                    <p className="break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">"{item.quote}"</p>
                    <footer className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{item.name}</span> · {item.role}
                    </footer>
                  </blockquote>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="forex" className="py-16">
          <div className="reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 h-1.5 w-40 rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-400" />
            <SectionHeader
              eyebrow={t("home.sectionForex")}
              title={productSections.forex.title}
              description={productSections.forex.description}
              searchValue={forex.search}
              sortValue={forex.sort}
              onSearchChange={(value) => {
                forex.setSearch(value);
                trackAnalyticsEvent("product_search", { sectionId: "forex", query: value });
              }}
              onSortChange={(value) => {
                forex.setSort(value);
                trackAnalyticsEvent("product_sort", { sectionId: "forex", sort: value });
              }}
              updatedAt={siteUpdatedAt}
            />
            <div className="grid grid-cols-1 justify-items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {renderProductGrid(forex.filteredProducts, content.products.forex.length)}
            </div>
          </div>
        </section>

        <section id="betting" className="py-16">
          <div className="reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 h-1.5 w-40 rounded-full bg-gradient-to-r from-emerald-500 via-green-400 to-lime-400" />
            <SectionHeader
              eyebrow={t("home.sectionBetting")}
              title={productSections.betting.title}
              description={productSections.betting.description}
              searchValue={betting.search}
              sortValue={betting.sort}
              onSearchChange={(value) => {
                betting.setSearch(value);
                trackAnalyticsEvent("product_search", { sectionId: "betting", query: value });
              }}
              onSortChange={(value) => {
                betting.setSort(value);
                trackAnalyticsEvent("product_sort", { sectionId: "betting", sort: value });
              }}
              updatedAt={siteUpdatedAt}
            />
            <div className="grid grid-cols-1 justify-items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {renderProductGrid(betting.filteredProducts, content.products.betting.length)}
            </div>
          </div>
        </section>

        <section id="software" className="py-16">
          <div className="reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 h-1.5 w-40 rounded-full bg-gradient-to-r from-rose-500 via-red-400 to-pink-400" />
            <SectionHeader
              eyebrow={t("home.sectionSoftware")}
              title={productSections.software.title}
              description={productSections.software.description}
              searchValue={software.search}
              sortValue={software.sort}
              onSearchChange={(value) => {
                software.setSearch(value);
                trackAnalyticsEvent("product_search", { sectionId: "software", query: value });
              }}
              onSortChange={(value) => {
                software.setSort(value);
                trackAnalyticsEvent("product_sort", { sectionId: "software", sort: value });
              }}
              updatedAt={siteUpdatedAt}
            />
            <div className="grid grid-cols-1 justify-items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {renderProductGrid(software.filteredProducts, content.products.software.length)}
            </div>
          </div>
        </section>

        <section id="social" className="py-16">
          <div className="reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 h-1.5 w-40 rounded-full bg-gradient-to-r from-cyan-500 via-blue-400 to-indigo-400" />
            <SectionHeader
              eyebrow={t("home.sectionSocial")}
              title={productSections.social.title}
              description={productSections.social.description}
              searchValue={social.search}
              sortValue={social.sort}
              onSearchChange={(value) => {
                social.setSearch(value);
                trackAnalyticsEvent("product_search", { sectionId: "social", query: value });
              }}
              onSortChange={(value) => {
                social.setSort(value);
                trackAnalyticsEvent("product_sort", { sectionId: "social", sort: value });
              }}
              updatedAt={siteUpdatedAt}
            />
            <div className="grid grid-cols-1 justify-items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {renderProductGrid(social.filteredProducts, content.products.social.length)}
            </div>
          </div>
        </section>
      </main>

      <section className="border-y border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 py-12 dark:border-slate-800 dark:bg-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">{t("home.industriesLabel")}</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{homeUi.industriesHeading}</h3>
          </div>
          {content.industries.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {homeUi.industriesEmptyMessage}
            </div>
          ) : (
            <div
              ref={industriesScrollRef}
              className="scrollbar-none overflow-x-auto overflow-y-hidden py-4"
              onMouseEnter={() => setIndustriesScrollPaused(true)}
              onMouseLeave={() => setIndustriesScrollPaused(false)}
              onPointerDown={() => setIndustriesScrollPaused(true)}
              onPointerUp={() => setIndustriesScrollPaused(false)}
              onPointerCancel={() => setIndustriesScrollPaused(false)}
              onFocusCapture={() => setIndustriesScrollPaused(true)}
              onBlurCapture={() => setIndustriesScrollPaused(false)}
            >
              <div className="flex min-w-max touch-pan-x flex-nowrap items-center justify-start gap-6 px-4 md:gap-8">
                {industriesForTrack.map((industry, index) => {
                  const isClone = index >= content.industries.length;
                  return (
                  <div
                    key={`${industry.id}-${index}`}
                    aria-hidden={isClone}
                    className="flex min-w-[96px] items-center justify-center px-2 py-2 md:px-3"
                  >
                    {industry.link?.trim() ? (
                      <a
                        href={industry.link.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${industry.label}`}
                        tabIndex={isClone ? -1 : 0}
                      >
                        {industry.imageUrl ? (
                          <img src={industry.imageUrl} alt={industry.label} className="h-16 w-16 rounded object-cover shadow-[0_10px_24px_-12px_rgba(37,99,235,0.55)] transition hover:scale-105 dark:shadow-none" />
                        ) : (
                          <span aria-hidden="true" className="text-4xl">
                            {industry.icon ?? "•"}
                          </span>
                        )}
                      </a>
                    ) : industry.imageUrl ? (
                      <img
                        src={industry.imageUrl}
                        alt={industry.label}
                        className="h-16 w-16 rounded object-cover shadow-[0_10px_24px_-12px_rgba(37,99,235,0.55)] dark:shadow-none"
                      />
                    ) : (
                      <span aria-hidden="true" className="text-4xl">
                        {industry.icon ?? "•"}
                      </span>
                    )}
                    <span className="sr-only">{industry.label}</span>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="relative overflow-hidden py-14">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-100 via-sky-100 to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950" />
        <div className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-white/40 blur-3xl dark:bg-cyan-800/20" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-52 w-52 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-700/20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-white/80 via-sky-50/80 to-blue-50/80 p-6 shadow-[0_24px_48px_-30px_rgba(15,23,42,0.4)] backdrop-blur dark:from-slate-900/85 dark:via-slate-900/80 dark:to-blue-950/80 dark:shadow-[0_20px_45px_-18px_rgba(0,0,0,0.9),0_0_0_1px_rgba(148,163,184,0.25)]">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("home.quickLinks")}</h4>
                <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <a href={withBasePath("/forex")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/forex")); window.dispatchEvent(new PopStateEvent("popstate")); smoothScrollToId("forex"); }} className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                    {t("navbar.forex")}
                  </a>
                  <a href={withBasePath("/betting")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/betting")); window.dispatchEvent(new PopStateEvent("popstate")); smoothScrollToId("betting"); }} className="block transition hover:text-emerald-600 dark:hover:text-blue-400">
                    {t("navbar.betting")}
                  </a>
                  <a href={withBasePath("/software")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/software")); window.dispatchEvent(new PopStateEvent("popstate")); smoothScrollToId("software"); }} className="block transition hover:text-rose-600 dark:hover:text-blue-400">
                    {t("navbar.software")}
                  </a>
                  <a href={withBasePath("/social")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/social")); window.dispatchEvent(new PopStateEvent("popstate")); smoothScrollToId("social"); }} className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                    {t("navbar.social")}
                  </a>
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("home.socialLinks")}</h4>
                <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <a href={content.socials.facebookUrl} target="_blank" rel="noopener noreferrer" className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                    Facebook
                  </a>
                  <a href={content.socials.whatsappUrl} target="_blank" rel="noopener noreferrer" className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                    WhatsApp
                  </a>
                  {(content.socials.other ?? []).map((social) => (
                    <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                      {social.name}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{content.branding.logoText}</h4>
                <p className="text-sm text-slate-700 dark:text-slate-200">{content.footer.note}</p>
                <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <a
                    href={withBasePath("/affiliate-disclosure")}
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, "", withBasePath("/affiliate-disclosure"));
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                    className="block transition hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    {t("home.affiliateDisclosure")}
                  </a>
                  <a
                    href={withBasePath("/earnings-disclaimer")}
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, "", withBasePath("/earnings-disclaimer"));
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                    className="block transition hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    {t("home.earningsDisclaimer")}
                  </a>
                  <a
                    href={withBasePath("/privacy")}
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, "", withBasePath("/privacy"));
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                    className="block transition hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    {t("home.privacyPolicy")}
                  </a>
                  <a
                    href={withBasePath("/terms")}
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, "", withBasePath("/terms"));
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                    className="block transition hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    {t("home.termsOfUse")}
                  </a>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
                    className="block text-left transition hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    {t("home.cookieSettings")}
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-8 pt-5 text-xs text-slate-500 dark:text-slate-300">
              {content.footer.copyright || `© ${footerYear} ${content.branding.logoText}. All rights reserved.`}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  window.open(withBasePath("/boss/login"), "_blank", "noopener,noreferrer");
                }}
                aria-label={t("home.loginAria")}
                className="inline-flex h-4 w-4 rounded-full border border-slate-400/80 bg-transparent transition hover:scale-105 dark:border-slate-500/70"
              />
            </div>
          </div>
        </div>
      </footer>

      <BackToTop />
      <QuickGrabsModal open={quickGrabsOpen} onClose={() => setQuickGrabsOpen(false)} returnFocusTo={quickGrabsTrigger} />
      <ProductModal product={infoProduct} onClose={() => setInfoProduct(null)} returnFocusTo={infoTrigger} />
    </div>
  );
};

export default Home;
