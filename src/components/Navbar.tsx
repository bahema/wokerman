import { useEffect, useRef, useState } from "react";
import logo from "../assets/logo.png";
import type { Theme } from "../utils/theme";
import { smoothScrollToId } from "../utils/smoothScroll";
import FollowUsPopover from "./FollowUsPopover";
import ThemeToggle from "./ThemeToggle";
import { withBasePath } from "../utils/basePath";
import { acquireBodyScrollLock } from "../utils/scrollLock";

type NavbarProps = {
  activeSection: string;
  theme: Theme;
  onThemeToggle: () => void;
  logoText: string;
  socials: { facebookUrl: string; whatsappUrl: string; other?: Array<{ name: string; url: string }> };
  eventThemeActive?: boolean;
};

const navLinks = [
  { id: "forex", label: "Forex" },
  { id: "betting", label: "Betting" },
  { id: "software", label: "Software" },
  { id: "social", label: "Social" }
];

const Navbar = ({ activeSection, theme, onThemeToggle, logoText, socials, eventThemeActive = false }: NavbarProps) => {
  const [openPopover, setOpenPopover] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigateToSection = (sectionId: string, options?: { closeMobileMenu?: boolean }) => {
    const nextPath = withBasePath(`/${sectionId}`);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }

    if (options?.closeMobileMenu) {
      setMobileMenuOpen(false);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => smoothScrollToId(sectionId));
      });
      return;
    }

    smoothScrollToId(sectionId);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onPopState = () => setMobileMenuOpen(false);
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    return acquireBodyScrollLock();
  }, [mobileMenuOpen]);

  return (
    <header
      className={`relative z-[1000] border-b shadow-sm backdrop-blur ${
        eventThemeActive
          ? "event-nav"
          : "border-slate-200/70 bg-white/85 dark:border-slate-700/80 dark:bg-slate-950/95"
      }`}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-w-0 items-center justify-between gap-3">
          <a
            href={withBasePath("/")}
            onClick={(event) => {
              event.preventDefault();
              window.history.pushState({}, "", withBasePath("/"));
              window.dispatchEvent(new PopStateEvent("popstate"));
              window.scrollTo({ top: 0, behavior: "smooth" });
              setMobileMenuOpen(false);
            }}
            className={`inline-flex min-w-0 max-w-[68%] items-center gap-2 rounded-xl p-1 pr-2 transition md:max-w-none ${
              eventThemeActive ? "hover:bg-white/10" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            aria-label="AutoHub home"
          >
            <img src={logo} alt="AutoHub logo" className="h-9 w-9 rounded-lg object-cover" />
            <span className={`truncate text-base font-bold tracking-tight ${eventThemeActive ? "event-nav-text" : "text-slate-900 dark:text-slate-50"}`}>
              {logoText || "AutoHub"}
            </span>
          </a>

          <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={withBasePath(`/${link.id}`)}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToSection(link.id);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? eventThemeActive
                        ? "event-nav-active shadow"
                        : "bg-blue-600 text-white shadow"
                      : eventThemeActive
                        ? "event-nav-muted hover:bg-white/10"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="relative flex shrink-0 items-center gap-2">
            <div className="hidden md:block">
              <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            </div>
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpenPopover((prev) => !prev)}
              aria-expanded={openPopover}
              aria-haspopup="dialog"
              className={`hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 md:inline-flex ${
                eventThemeActive ? "event-nav-active hover:brightness-110" : "bg-slate-900 hover:bg-slate-700 dark:bg-blue-600 dark:hover:bg-blue-500"
              }`}
            >
              Follow us
            </button>
            <FollowUsPopover open={openPopover} onClose={() => setOpenPopover(false)} buttonRef={buttonRef} socials={socials} />
            <div className="md:hidden">
              <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            </div>
            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 md:hidden"
            >
              <span className="sr-only">Toggle menu</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileMenuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen ? (
          <div
            className="fixed inset-0 top-16 z-[1100] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            role="presentation"
          />
        ) : null}
        <nav
          id="mobile-nav-menu"
          aria-label="Primary mobile"
          className={`fixed left-4 right-4 top-16 z-[1110] mt-2 rounded-2xl border border-white/10 bg-slate-950/90 p-3 text-white shadow-xl backdrop-blur-md transition duration-200 md:hidden sm:left-auto sm:w-80 ${
            mobileMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
          }`}
        >
          <div className="mb-2 border-b border-white/10 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Menu
          </div>
          <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <a
                    key={`mobile-${link.id}`}
                    href={withBasePath(`/${link.id}`)}
                    onClick={(event) => {
                      event.preventDefault();
                      navigateToSection(link.id, { closeMobileMenu: true });
                    }}
                    className={`rounded-xl px-3 py-2 text-center text-sm font-medium transition ${
                      isActive
                        ? eventThemeActive
                          ? "event-nav-active text-white shadow"
                          : "bg-blue-600 text-white shadow"
                        : eventThemeActive
                          ? "bg-black/35 text-white hover:bg-black/45"
                          : "bg-slate-900/80 text-slate-100 hover:bg-slate-800"
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
