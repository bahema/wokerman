import { useEffect, useRef, useState } from "react";
import BackToTop from "../components/BackToTop";
import CheckoutModal from "../components/CheckoutModal";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import QuickGrabsModal from "../components/QuickGrabsModal";
import SectionHeader from "../components/SectionHeader";
import type { Product } from "../data/siteData";
import { smoothScrollToId } from "../utils/smoothScroll";
import { getInitialTheme, type Theme, updateTheme } from "../utils/theme";
import { useProductFilters } from "../utils/useProductFilters";
import { useSectionObserver } from "../utils/useSectionObserver";
import { defaultProductSections, defaultSiteContent } from "../data/siteData";
import { getDraftContentAsync, getPublishedContentAsync, getSiteMetaAsync } from "../utils/adminStorage";
import { trackAnalyticsEvent } from "../utils/analytics";
import { removeStructuredData, setStructuredData } from "../utils/seo";
import { withBasePath } from "../utils/basePath";

type HomeProps = {
  initialSection?: "forex" | "betting" | "software" | "social";
};

const Home = ({ initialSection }: HomeProps) => {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [content, setContent] = useState(defaultSiteContent);
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
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [quickGrabsOpen, setQuickGrabsOpen] = useState(false);
  const [infoTrigger, setInfoTrigger] = useState<HTMLElement | null>(null);
  const [checkoutTrigger, setCheckoutTrigger] = useState<HTMLElement | null>(null);
  const [quickGrabsTrigger, setQuickGrabsTrigger] = useState<HTMLElement | null>(null);
  const lastTrackedSection = useRef<string>("");
  const productSections = content.productSections ?? defaultProductSections;

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const metaPromise = getSiteMetaAsync();
        const params = new URLSearchParams(window.location.search);
        let nextContent = defaultSiteContent;
        if (params.get("preview") === "draft") {
          const draft = await getDraftContentAsync();
          if (!cancelled && draft) {
            nextContent = draft;
          }
        }
        if (nextContent === defaultSiteContent) {
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
          setContent(defaultSiteContent);
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
          const nextContent = params.get("preview") === "draft" ? (await getDraftContentAsync()) ?? defaultSiteContent : await getPublishedContentAsync();
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
    if (!checkoutProduct) return;
    trackAnalyticsEvent("checkout_modal_open", {
      productId: checkoutProduct.id,
      category: checkoutProduct.category
    });
  }, [checkoutProduct]);

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
    if (loadingContent || !initialSection) return;
    const timer = window.setTimeout(() => smoothScrollToId(initialSection), 60);
    return () => window.clearTimeout(timer);
  }, [initialSection, loadingContent]);

  useEffect(() => {
    const origin = window.location.origin;
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
          sameAs: [content.socials.facebookUrl, content.socials.whatsappUrl, ...(content.socials.other ?? []).map((social) => social.url)].filter(Boolean)
        },
        {
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          name: content.branding.logoText || "AutoHub",
          url: `${origin}/`,
          inLanguage: "en"
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
              url: item.checkoutLink,
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
        onCheckout={(item, trigger) => {
          trackAnalyticsEvent("product_link_click", {
            productId: item.id,
            category: item.category,
            source: "product_card",
            action: "checkout_button"
          });
          setCheckoutProduct(item);
          setCheckoutTrigger(trigger);
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        activeSection={activeSection}
        theme={theme}
        onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        logoText={content.branding.logoText}
        socials={content.socials}
      />

      <main className="overflow-x-hidden pt-16">
        <section className="relative overflow-hidden py-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50 via-sky-50 to-slate-50 dark:from-transparent dark:via-transparent dark:to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative grid items-center gap-8 lg:grid-cols-2">
              <div className="reveal min-w-0 space-y-6">
                <span className="inline-flex rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
                  Smart automation for modern operators
                </span>
                <h1 className="break-words text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">{content.hero.headline}</h1>
                <p className="max-w-xl break-words text-base text-slate-600 dark:text-slate-200">{content.hero.subtext}</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => runTarget(content.hero.ctaPrimary.target)}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-500"
                  >
                    {content.hero.ctaPrimary.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => runTarget(content.hero.ctaSecondary.target)}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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
                  className="inline-flex w-fit max-w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-500"
                >
                  Quick Grabs
                </button>
              </div>

              <div className="reveal min-w-0 max-w-full rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-800 p-6 text-white shadow-[0_24px_45px_-26px_rgba(30,64,175,0.8)] dark:border-slate-700 dark:from-slate-900 dark:via-blue-900 dark:to-slate-800">
                <h3 className="text-lg font-semibold">Performance Snapshot</h3>
                <p className="mt-1 text-sm text-slate-100">Products tuned for speed, confidence, and measurable outcomes.</p>
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
              eyebrow="Forex"
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
              eyebrow="Betting System"
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
              eyebrow="Software"
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
              eyebrow="Social"
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
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">Industries</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Industries We Work With</h3>
          </div>
          {content.industries.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              No industries published yet. Add industries from Admin to show them here.
            </div>
          ) : (
            <div
              ref={industriesScrollRef}
              className="overflow-hidden py-4"
              onMouseEnter={() => setIndustriesScrollPaused(true)}
              onMouseLeave={() => setIndustriesScrollPaused(false)}
              onPointerDown={() => setIndustriesScrollPaused(true)}
              onPointerUp={() => setIndustriesScrollPaused(false)}
              onPointerCancel={() => setIndustriesScrollPaused(false)}
              onFocusCapture={() => setIndustriesScrollPaused(true)}
              onBlurCapture={() => setIndustriesScrollPaused(false)}
            >
              <div className="flex min-w-max touch-pan-y flex-nowrap items-center justify-start gap-6 px-4 md:gap-8">
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
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Quick links</h4>
                <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <a href={withBasePath("/forex")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/forex")); window.dispatchEvent(new PopStateEvent("popstate")); smoothScrollToId("forex"); }} className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                    Forex
                  </a>
                  <a href={withBasePath("/betting")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/betting")); window.dispatchEvent(new PopStateEvent("popstate")); smoothScrollToId("betting"); }} className="block transition hover:text-emerald-600 dark:hover:text-blue-400">
                    Betting
                  </a>
                  <a href={withBasePath("/software")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/software")); window.dispatchEvent(new PopStateEvent("popstate")); smoothScrollToId("software"); }} className="block transition hover:text-rose-600 dark:hover:text-blue-400">
                    Software
                  </a>
                  <a href={withBasePath("/social")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/social")); window.dispatchEvent(new PopStateEvent("popstate")); smoothScrollToId("social"); }} className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                    Social
                  </a>
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Social links</h4>
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
                    Affiliate Disclosure
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
                    Earnings Disclaimer
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
                    Privacy Policy
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
                    Terms of Use
                  </a>
                </div>
              </div>
            </div>
            <p className="mt-8 pt-5 text-xs text-slate-500 dark:text-slate-300">
              {content.footer.copyright || `© ${footerYear} ${content.branding.logoText}. All rights reserved.`}
            </p>
            <div className="mt-4 flex justify-end">
              <a
                href={withBasePath("/boss/login")}
                aria-label="Go to login page"
                className="inline-flex h-4 w-4 rounded-full bg-red-600 shadow-[0_0_0_4px_rgba(220,38,38,0.2)] transition hover:scale-110 hover:bg-red-500"
              />
            </div>
          </div>
        </div>
      </footer>

      <BackToTop />
      <QuickGrabsModal open={quickGrabsOpen} onClose={() => setQuickGrabsOpen(false)} returnFocusTo={quickGrabsTrigger} />
      <ProductModal product={infoProduct} onClose={() => setInfoProduct(null)} returnFocusTo={infoTrigger} />
      <CheckoutModal product={checkoutProduct} onClose={() => setCheckoutProduct(null)} returnFocusTo={checkoutTrigger} />
    </div>
  );
};

export default Home;
