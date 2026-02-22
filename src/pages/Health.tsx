import { useEffect, useRef, useState, type CSSProperties } from "react";
import Navbar from "../components/Navbar";
import BackToTop from "../components/BackToTop";
import { type SiteContent } from "../../shared/siteTypes";
import { defaultSiteContent } from "../data/siteData";
import { getPublishedContentAsync } from "../utils/adminStorage";
import { getInitialTheme, type Theme, updateTheme } from "../utils/theme";
import { getEventThemeCssVars } from "../utils/eventTheme";
import { OPEN_COOKIE_SETTINGS_EVENT } from "../utils/cookieConsent";
import { withBasePath } from "../utils/basePath";
import { useI18n } from "../i18n/provider";

type HealthItem = {
  id: string;
  title: string;
  description: string;
  price: string;
};

const healthyGadgets: HealthItem[] = [
  {
    id: "g-1",
    title: "Smart Posture Band",
    description: "Tracks posture habits and gives gentle vibration reminders throughout the day.",
    price: "$79"
  },
  {
    id: "g-2",
    title: "Portable Air Quality Meter",
    description: "Measures PM2.5 and VOC levels so you can improve indoor breathing conditions.",
    price: "$94"
  },
  {
    id: "g-3",
    title: "Hydration Reminder Bottle",
    description: "LED and app reminders to keep daily hydration goals consistent.",
    price: "$49"
  }
];

const healthySupplements: HealthItem[] = [
  {
    id: "s-1",
    title: "Daily Multivitamin Pack",
    description: "Balanced daily support formula for energy, immunity, and micronutrient coverage.",
    price: "$39"
  },
  {
    id: "s-2",
    title: "Omega-3 Complex",
    description: "High-potency EPA/DHA support for heart, brain, and inflammatory balance.",
    price: "$44"
  },
  {
    id: "s-3",
    title: "Magnesium + Zinc Recovery",
    description: "Evening recovery formula designed for muscle support and sleep quality.",
    price: "$36"
  }
];

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

  const eventTheme = content.branding.eventTheme ?? "none";
  const eventThemeActive = eventTheme !== "none";
  const eventThemeVars = getEventThemeCssVars(eventTheme, theme) as CSSProperties;

  const sectionCard = (item: HealthItem) => (
    <article
      key={item.id}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">Health Pick</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
      <p className="mt-4 inline-flex rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">{item.price}</p>
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
              Wellness Collection
            </span>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
              Health Tools And Supplements For Better Daily Performance
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-300">
              Discover high-quality healthy gadgets and trusted supplement picks designed for focus, energy, recovery, and long-term wellness habits.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => document.getElementById("healthy-gadgets")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                View Healthy Gadgets
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("healthy-supplements")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View Healthy Supplements
              </button>
            </div>
          </div>
        </section>

        <section id="healthy-gadgets" className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Section 1</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Healthy Gadgets</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Smart devices to support better sleep, movement, breathing, and hydration.
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{healthyGadgets.map(sectionCard)}</div>
          </div>
        </section>

        <section id="healthy-supplements" className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Section 2</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Healthy Supplements</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Daily wellness formulas selected for consistency, quality, and practical use.
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{healthySupplements.map(sectionCard)}</div>
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
