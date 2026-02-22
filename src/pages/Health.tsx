import { useEffect, useRef, useState, type CSSProperties } from "react";
import Navbar from "../components/Navbar";
import BackToTop from "../components/BackToTop";
import { type HealthCatalogItem, type SiteContent } from "../../shared/siteTypes";
import { defaultHealthPage, defaultSiteContent } from "../data/siteData";
import { getPublishedContentAsync } from "../utils/adminStorage";
import { getInitialTheme, type Theme, updateTheme } from "../utils/theme";
import { getEventThemeCssVars } from "../utils/eventTheme";
import { OPEN_COOKIE_SETTINGS_EVENT } from "../utils/cookieConsent";
import { withBasePath } from "../utils/basePath";
import { useI18n } from "../i18n/provider";

const Health = () => {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const industriesScrollRef = useRef<HTMLDivElement>(null);
  const [industriesScrollPaused, setIndustriesScrollPaused] = useState(false);
  const footerYear = new Date().getFullYear();

  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const published = await getPublishedContentAsync();
        if (!cancelled) setContent(published);
      } catch {
        if (!cancelled) setContent(defaultSiteContent);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        const travelWidth = el.scrollWidth - el.clientWidth;
        if (travelWidth > 0) {
          const next = el.scrollLeft + delta * speedPxPerMs;
          el.scrollLeft = next >= travelWidth ? 0 : next;
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [content.industries.length, industriesScrollPaused]);

  const healthPage = {
    ...defaultHealthPage,
    ...(content.healthPage ?? {}),
    hero2: {
      ...defaultHealthPage.hero2,
      ...(content.healthPage?.hero2 ?? {})
    },
    sections: {
      gadgets: {
        ...defaultHealthPage.sections.gadgets,
        ...(content.healthPage?.sections?.gadgets ?? {})
      },
      supplements: {
        ...defaultHealthPage.sections.supplements,
        ...(content.healthPage?.sections?.supplements ?? {})
      }
    },
    products: {
      gadgets: content.healthPage?.products?.gadgets ?? defaultHealthPage.products.gadgets,
      supplements: content.healthPage?.products?.supplements ?? defaultHealthPage.products.supplements
    }
  };

  const runTarget = (target: string) => {
    const normalized = target.trim().toLowerCase().replace("#", "");
    if (normalized.startsWith("http")) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }
    const targetMap: Record<string, string> = {
      gadgets: "healthy-gadgets",
      supplements: "healthy-supplements",
      "healthy-gadgets": "healthy-gadgets",
      "healthy-supplements": "healthy-supplements"
    };
    const nextId = targetMap[normalized] ?? normalized;
    document.getElementById(nextId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resolveImage = (input?: string) => {
    if (!input) return "";
    return input.startsWith("http") ? input : withBasePath(input);
  };

  const eventTheme = content.branding.eventTheme ?? "none";
  const eventThemeActive = eventTheme !== "none";
  const eventThemeVars = getEventThemeCssVars(eventTheme, theme) as CSSProperties;

  const sectionCard = (item: HealthCatalogItem) => (
    <article
      key={item.id}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">{item.badge?.trim() || "Health Pick"}</p>
        {item.priceLabel?.trim() ? (
          <p className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">{item.priceLabel}</p>
        ) : null}
      </div>
      {item.imageUrl?.trim() ? (
        <img
          src={resolveImage(item.imageUrl)}
          alt={item.title}
          className="mb-3 h-36 w-full rounded-xl object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
      {item.link?.trim() ? (
        <button
          type="button"
          onClick={() => window.open(item.link, "_blank", "noopener,noreferrer")}
          className="mt-4 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/80 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          View product
        </button>
      ) : null}
    </article>
  );

  return (
    <div
      className={`min-h-screen overflow-x-hidden text-slate-900 dark:text-slate-100 ${
        eventThemeActive ? "event-page" : "bg-slate-50 dark:bg-slate-950"
      }`}
      style={eventThemeVars}
    >
      <Navbar
        activeSection="health"
        theme={theme}
        onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        logoText={content.branding.logoText}
        socials={content.socials}
        eventThemeActive={eventThemeActive}
      />

      <main className="overflow-x-hidden">
        <section className="relative overflow-hidden py-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-50 via-cyan-50 to-slate-50 dark:from-transparent dark:via-transparent dark:to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
              {healthPage.hero2.eyebrow}
            </span>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">{healthPage.hero2.headline}</h1>
            <p className="mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-300">{healthPage.hero2.subtext}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => runTarget(healthPage.hero2.ctaPrimary.target)}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                {healthPage.hero2.ctaPrimary.label}
              </button>
              <button
                type="button"
                onClick={() => runTarget(healthPage.hero2.ctaSecondary.target)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {healthPage.hero2.ctaSecondary.label}
              </button>
            </div>
          </div>
        </section>

        <section id="healthy-gadgets" className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Section 1</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{healthPage.sections.gadgets.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{healthPage.sections.gadgets.description}</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {healthPage.products.gadgets.length > 0 ? (
                healthPage.products.gadgets.map(sectionCard)
              ) : (
                <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  No gadgets published yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="healthy-supplements" className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Section 2</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{healthPage.sections.supplements.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{healthPage.sections.supplements.description}</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {healthPage.products.supplements.length > 0 ? (
                healthPage.products.supplements.map(sectionCard)
              ) : (
                <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  No supplements published yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <section className="border-y border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 py-12 dark:border-slate-800 dark:bg-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">{t("home.industriesLabel")}</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{content.homeUi?.industriesHeading ?? "Industries We Work With"}</h3>
          </div>
          {content.industries.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {content.homeUi?.industriesEmptyMessage ?? "No industries published yet."}
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
                {content.industries.map((industry) => (
                  <div key={industry.id} className="flex min-w-[96px] items-center justify-center px-2 py-2 md:px-3">
                    {industry.link?.trim() ? (
                      <a href={industry.link.trim()} target="_blank" rel="noopener noreferrer" aria-label={`Open ${industry.label}`}>
                        {industry.imageUrl ? (
                          <img src={industry.imageUrl} alt={industry.label} className="h-16 w-16 rounded object-cover shadow-[0_10px_24px_-12px_rgba(37,99,235,0.55)] transition hover:scale-105 dark:shadow-none" />
                        ) : (
                          <span aria-hidden="true" className="text-4xl">{industry.icon ?? "•"}</span>
                        )}
                      </a>
                    ) : industry.imageUrl ? (
                      <img src={industry.imageUrl} alt={industry.label} className="h-16 w-16 rounded object-cover shadow-[0_10px_24px_-12px_rgba(37,99,235,0.55)] dark:shadow-none" />
                    ) : (
                      <span aria-hidden="true" className="text-4xl">{industry.icon ?? "•"}</span>
                    )}
                    <span className="sr-only">{industry.label}</span>
                  </div>
                ))}
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
                  <a href={withBasePath("/health")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/health")); window.dispatchEvent(new PopStateEvent("popstate")); }} className="block transition hover:text-emerald-600 dark:hover:text-emerald-400">{t("navbar.health")}</a>
                  <a href={withBasePath("/forex")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/forex")); window.dispatchEvent(new PopStateEvent("popstate")); }} className="block transition hover:text-blue-600 dark:hover:text-blue-400">{t("navbar.forex")}</a>
                  <a href={withBasePath("/betting")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/betting")); window.dispatchEvent(new PopStateEvent("popstate")); }} className="block transition hover:text-emerald-600 dark:hover:text-blue-400">{t("navbar.betting")}</a>
                  <a href={withBasePath("/software")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/software")); window.dispatchEvent(new PopStateEvent("popstate")); }} className="block transition hover:text-rose-600 dark:hover:text-blue-400">{t("navbar.software")}</a>
                  <a href={withBasePath("/social")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/social")); window.dispatchEvent(new PopStateEvent("popstate")); }} className="block transition hover:text-blue-600 dark:hover:text-blue-400">{t("navbar.social")}</a>
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t("home.socialLinks")}</h4>
                <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  <a href={content.socials.facebookUrl} target="_blank" rel="noopener noreferrer" className="block transition hover:text-blue-600 dark:hover:text-blue-400">Facebook</a>
                  <a href={content.socials.whatsappUrl} target="_blank" rel="noopener noreferrer" className="block transition hover:text-blue-600 dark:hover:text-blue-400">WhatsApp</a>
                  {(content.socials.other ?? []).map((social) => (
                    <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" className="block transition hover:text-blue-600 dark:hover:text-blue-400">{social.name}</a>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{content.branding.logoText}</h4>
                <p className="text-sm text-slate-700 dark:text-slate-200">{content.footer.note}</p>
                <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <a href={withBasePath("/affiliate-disclosure")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/affiliate-disclosure")); window.dispatchEvent(new PopStateEvent("popstate")); }} className="block transition hover:text-emerald-700 dark:hover:text-emerald-400">{t("home.affiliateDisclosure")}</a>
                  <a href={withBasePath("/earnings-disclaimer")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/earnings-disclaimer")); window.dispatchEvent(new PopStateEvent("popstate")); }} className="block transition hover:text-emerald-700 dark:hover:text-emerald-400">{t("home.earningsDisclaimer")}</a>
                  <a href={withBasePath("/privacy")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/privacy")); window.dispatchEvent(new PopStateEvent("popstate")); }} className="block transition hover:text-emerald-700 dark:hover:text-emerald-400">{t("home.privacyPolicy")}</a>
                  <a href={withBasePath("/terms")} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", withBasePath("/terms")); window.dispatchEvent(new PopStateEvent("popstate")); }} className="block transition hover:text-emerald-700 dark:hover:text-emerald-400">{t("home.termsOfUse")}</a>
                  <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))} className="block text-left transition hover:text-emerald-700 dark:hover:text-emerald-400">{t("home.cookieSettings")}</button>
                </div>
              </div>
            </div>
            <p className="mt-8 pt-5 text-xs text-slate-500 dark:text-slate-300">
              {content.footer.copyright || `© ${footerYear} ${content.branding.logoText}. All rights reserved.`}
            </p>
          </div>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
};

export default Health;
