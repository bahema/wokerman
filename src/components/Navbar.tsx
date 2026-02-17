import { useRef, useState } from "react";
import logo from "../assets/logo.png";
import type { Theme } from "../utils/theme";
import { smoothScrollToId } from "../utils/smoothScroll";
import FollowUsPopover from "./FollowUsPopover";
import ThemeToggle from "./ThemeToggle";
import { withBasePath } from "../utils/basePath";

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
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <a
            href={withBasePath("/")}
            onClick={(event) => {
              event.preventDefault();
              window.history.pushState({}, "", "/");
              window.dispatchEvent(new PopStateEvent("popstate"));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="AutoHub home"
          >
            <img src={logo} alt="AutoHub logo" className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">{logoText || "AutoHub"}</span>
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
                    window.history.pushState({}, "", `/${link.id}`);
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

          <div className="relative flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpenPopover((prev) => !prev)}
              aria-expanded={openPopover}
              aria-haspopup="dialog"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
            >
              Follow us
            </button>
            <FollowUsPopover open={openPopover} onClose={() => setOpenPopover(false)} buttonRef={buttonRef} socials={socials} />
          </div>
        </div>
        <nav aria-label="Primary mobile" className="md:hidden pb-3">
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={`mobile-${link.id}`}
                  href={withBasePath(`/${link.id}`)}
                  onClick={(event) => {
                    event.preventDefault();
                    window.history.pushState({}, "", `/${link.id}`);
                    window.dispatchEvent(new PopStateEvent("popstate"));
                    smoothScrollToId(link.id);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
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
