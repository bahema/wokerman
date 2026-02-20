import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./utils/theme";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { I18nProvider } from "./i18n/provider";

const safeDecode = (value: string | null) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const applyStaticHostRouteRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  const redirectedPath = params.get("p");
  if (!redirectedPath) return;

  const path = safeDecode(redirectedPath);
  const query = safeDecode(params.get("q"));
  const hash = safeDecode(params.get("h"));
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const queryPart = query ? `?${query}` : "";
  const hashPart = hash ? `#${hash}` : "";

  const rawBase = import.meta.env.BASE_URL || "/";
  const trimmedBase = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
  const basePath = !trimmedBase || trimmedBase === "/" ? "" : trimmedBase;
  window.history.replaceState({}, "", `${basePath}${normalizedPath}${queryPart}${hashPart}`);
};

applyStaticHostRouteRedirect();

document.documentElement.classList.add("js");
try {
  initTheme();
} catch (error) {
  console.error("Theme initialization failed:", error);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </I18nProvider>
  </React.StrictMode>
);
