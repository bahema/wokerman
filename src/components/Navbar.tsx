import { useEffect, useRef, useState } from "react";
import logo from "../assets/logo.png";
import type { Theme } from "../utils/theme";
import { smoothScrollToId } from "../utils/smoothScroll";
import FollowUsPopover from "./FollowUsPopover";
import ThemeToggle from "./ThemeToggle";
import { withBasePath } from "../utils/basePath";
import { useOutsideClick } from "../utils/useOutsideClick";

type NavbarProps = {
  activeSection: string;
  theme: Theme;
  onThemeToggle: () => void;
  logoText: string;
  socials: { facebookUrl: string; whatsappUrl: string; other?: Array<{ name: string; url: string }> };
};

const navLinks = [
  { id: "forex", label: "Forex" },
  { id: "betting", label: "Betting" },
  { id: "software", label: "Software" },
  { id: "social", label: "Social" }
];

const Navbar = ({ activeSection, theme, onThemeToggle, logoText, socials }: NavbarProps) => {
  const [openPopover, setOpenPopover] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(mobileMenuRef, () => setMobileMenuOpen(false), mobileMenuOpen);

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
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/95">
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
            className="inline-flex min-w-0 max-w-[68%] items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 md:max-w-none"
            aria-label="AutoHub home"
          >
            <img src={logo} alt="AutoHub logo" className="h-9 w-9 rounded-lg object-cover" />
            <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">{logoText || "AutoHub"}</span>
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
                    window.history.pushState({}, "", withBasePath(`/${link.id}`));
                    window.dispatchEvent(new PopStateEvent("popstate"));
                    smoothScrollToId(link.id);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div ref={mobileMenuRef} className="relative flex shrink-0 items-center gap-2">
            <div className="hidden md:block">
              <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            </div>
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpenPopover((prev) => !prev)}
              aria-expanded={openPopover}
              aria-haspopup="dialog"
              className="hidden rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 md:inline-flex"
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
        {mobileMenuOpen ? <div className="fixed inset-0 top-16 z-40 bg-slate-950/20 backdrop-blur-[1px] md:hidden" aria-hidden="true" /> : null}
        <nav
          id="mobile-nav-menu"
          aria-label="Primary mobile"
          className={`absolute right-4 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl transition duration-200 dark:border-slate-700 dark:bg-slate-900 md:hidden ${
            mobileMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
          }`}
        >
          <div className="mb-2 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:text-slate-300">
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
                      window.history.pushState({}, "", withBasePath(`/${link.id}`));
                      window.dispatchEvent(new PopStateEvent("popstate"));
                      smoothScrollToId(link.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`rounded-xl px-3 py-2 text-center text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow"
                        : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
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
