export type Theme = "light" | "dark";

const THEME_KEY = "theme";

const isTheme = (value: string | null): value is Theme => value === "light" || value === "dark";

const getSystemTheme = (): Theme => {
  try {
    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch {
    // no-op
  }
  return "light";
};

export const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // no-op
  }
  return getSystemTheme();
};

export const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
};

export const initTheme = (): Theme => {
  const theme = getInitialTheme();
  applyTheme(theme);
  return theme;
};

export const saveTheme = (theme: Theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // no-op
  }
};

export const updateTheme = (theme: Theme) => {
  applyTheme(theme);
  saveTheme(theme);
};
