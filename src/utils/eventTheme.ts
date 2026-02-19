import type { SiteEventTheme } from "../data/siteData";
import type { Theme } from "./theme";

type EventThemeTokens = {
  navBg: string;
  navBorder: string;
  navText: string;
  navMuted: string;
  navActiveBg: string;
  navActiveText: string;
  pageBg: string;
  heroSurface: string;
  heroBorder: string;
  heroButtonPrimaryBg: string;
  heroButtonPrimaryText: string;
  heroButtonSecondaryBg: string;
  heroButtonSecondaryText: string;
  chipBg: string;
  chipText: string;
};

const defaultLightTokens: EventThemeTokens = {
  navBg: "rgba(255,255,255,0.85)",
  navBorder: "rgba(148,163,184,0.35)",
  navText: "#0f172a",
  navMuted: "#334155",
  navActiveBg: "#2563eb",
  navActiveText: "#ffffff",
  pageBg: "#f8fafc",
  heroSurface: "#ffffff",
  heroBorder: "#cbd5e1",
  heroButtonPrimaryBg: "#2563eb",
  heroButtonPrimaryText: "#ffffff",
  heroButtonSecondaryBg: "#ffffff",
  heroButtonSecondaryText: "#334155",
  chipBg: "#dbeafe",
  chipText: "#1d4ed8"
};

const defaultDarkTokens: EventThemeTokens = {
  navBg: "rgba(2,6,23,0.92)",
  navBorder: "rgba(51,65,85,0.8)",
  navText: "#f8fafc",
  navMuted: "#cbd5e1",
  navActiveBg: "#2563eb",
  navActiveText: "#ffffff",
  pageBg: "#020617",
  heroSurface: "#0f172a",
  heroBorder: "#334155",
  heroButtonPrimaryBg: "#2563eb",
  heroButtonPrimaryText: "#ffffff",
  heroButtonSecondaryBg: "#0f172a",
  heroButtonSecondaryText: "#e2e8f0",
  chipBg: "rgba(30,58,138,0.42)",
  chipText: "#bfdbfe"
};

const themePresets: Record<Exclude<SiteEventTheme, "none">, { light: Partial<EventThemeTokens>; dark: Partial<EventThemeTokens> }> = {
  christmas: {
    light: {
      navBg: "rgba(248,250,252,0.92)",
      navBorder: "rgba(22,101,52,0.35)",
      navActiveBg: "#166534",
      pageBg: "#f8fafc",
      heroSurface: "#f0fdf4",
      heroBorder: "#86efac",
      heroButtonPrimaryBg: "#166534",
      heroButtonSecondaryBg: "#ffffff",
      chipBg: "#dcfce7",
      chipText: "#166534"
    },
    dark: {
      navBg: "rgba(6,26,18,0.92)",
      navBorder: "rgba(34,197,94,0.34)",
      navActiveBg: "#16a34a",
      pageBg: "#030712",
      heroSurface: "#052e16",
      heroBorder: "#166534",
      heroButtonPrimaryBg: "#16a34a",
      heroButtonSecondaryBg: "#052e16",
      chipBg: "rgba(20,83,45,0.62)",
      chipText: "#dcfce7"
    }
  },
  "new-year": {
    light: {
      navActiveBg: "#3730a3",
      heroSurface: "#eef2ff",
      heroBorder: "#a5b4fc",
      heroButtonPrimaryBg: "#3730a3",
      chipBg: "#e0e7ff",
      chipText: "#3730a3"
    },
    dark: {
      navBg: "rgba(17,24,39,0.94)",
      navBorder: "rgba(129,140,248,0.35)",
      navActiveBg: "#4f46e5",
      pageBg: "#020617",
      heroSurface: "#111827",
      heroBorder: "#4b5563",
      heroButtonPrimaryBg: "#4f46e5",
      heroButtonSecondaryBg: "#111827",
      chipBg: "rgba(67,56,202,0.45)",
      chipText: "#e0e7ff"
    }
  },
  valentine: {
    light: {
      navActiveBg: "#be185d",
      heroSurface: "#fdf2f8",
      heroBorder: "#f9a8d4",
      heroButtonPrimaryBg: "#be185d",
      chipBg: "#fce7f3",
      chipText: "#9d174d"
    },
    dark: {
      navBg: "rgba(40,12,28,0.92)",
      navBorder: "rgba(244,114,182,0.35)",
      navActiveBg: "#db2777",
      pageBg: "#09090b",
      heroSurface: "#4a044e",
      heroBorder: "#831843",
      heroButtonPrimaryBg: "#db2777",
      heroButtonSecondaryBg: "#3f032f",
      chipBg: "rgba(131,24,67,0.55)",
      chipText: "#fce7f3"
    }
  },
  easter: {
    light: {
      navActiveBg: "#7c3aed",
      heroSurface: "#f5f3ff",
      heroBorder: "#c4b5fd",
      heroButtonPrimaryBg: "#7c3aed",
      chipBg: "#ede9fe",
      chipText: "#5b21b6"
    },
    dark: {
      navBg: "rgba(23,14,52,0.92)",
      navBorder: "rgba(167,139,250,0.35)",
      navActiveBg: "#8b5cf6",
      heroSurface: "#312e81",
      heroBorder: "#4338ca",
      heroButtonPrimaryBg: "#8b5cf6",
      heroButtonSecondaryBg: "#312e81",
      chipBg: "rgba(91,33,182,0.55)",
      chipText: "#ede9fe"
    }
  },
  ramadan: {
    light: {
      navActiveBg: "#0f766e",
      heroSurface: "#ecfeff",
      heroBorder: "#67e8f9",
      heroButtonPrimaryBg: "#0f766e",
      chipBg: "#cffafe",
      chipText: "#155e75"
    },
    dark: {
      navBg: "rgba(6,28,33,0.92)",
      navBorder: "rgba(34,211,238,0.35)",
      navActiveBg: "#0e7490",
      heroSurface: "#083344",
      heroBorder: "#0e7490",
      heroButtonPrimaryBg: "#0e7490",
      heroButtonSecondaryBg: "#083344",
      chipBg: "rgba(21,94,117,0.55)",
      chipText: "#cffafe"
    }
  },
  eid: {
    light: {
      navActiveBg: "#15803d",
      heroSurface: "#f0fdf4",
      heroBorder: "#86efac",
      heroButtonPrimaryBg: "#15803d",
      chipBg: "#dcfce7",
      chipText: "#166534"
    },
    dark: {
      navBg: "rgba(5,26,14,0.93)",
      navBorder: "rgba(74,222,128,0.35)",
      navActiveBg: "#16a34a",
      heroSurface: "#14532d",
      heroBorder: "#166534",
      heroButtonPrimaryBg: "#16a34a",
      heroButtonSecondaryBg: "#14532d",
      chipBg: "rgba(22,101,52,0.6)",
      chipText: "#dcfce7"
    }
  }
};

const toCssVars = (tokens: EventThemeTokens): Record<string, string> => ({
  "--event-nav-bg": tokens.navBg,
  "--event-nav-border": tokens.navBorder,
  "--event-nav-text": tokens.navText,
  "--event-nav-muted": tokens.navMuted,
  "--event-nav-active-bg": tokens.navActiveBg,
  "--event-nav-active-text": tokens.navActiveText,
  "--event-page-bg": tokens.pageBg,
  "--event-hero-surface": tokens.heroSurface,
  "--event-hero-border": tokens.heroBorder,
  "--event-btn-primary-bg": tokens.heroButtonPrimaryBg,
  "--event-btn-primary-text": tokens.heroButtonPrimaryText,
  "--event-btn-secondary-bg": tokens.heroButtonSecondaryBg,
  "--event-btn-secondary-text": tokens.heroButtonSecondaryText,
  "--event-chip-bg": tokens.chipBg,
  "--event-chip-text": tokens.chipText
});

export const getEventThemeCssVars = (eventTheme: SiteEventTheme | undefined, mode: Theme): Record<string, string> => {
  const base = mode === "dark" ? defaultDarkTokens : defaultLightTokens;
  if (!eventTheme || eventTheme === "none") return toCssVars(base);
  const preset = themePresets[eventTheme];
  const merged = { ...base, ...(mode === "dark" ? preset.dark : preset.light) };
  return toCssVars(merged);
};
