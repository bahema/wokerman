const rawBase = import.meta.env.BASE_URL || "/";
const trimmedBase = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

export const appBasePath = !trimmedBase || trimmedBase === "/" ? "" : trimmedBase;

const detectRuntimeBasePath = () => {
  if (appBasePath) return appBasePath;
  if (typeof window === "undefined") return "";
  if (!window.location.hostname.endsWith(".github.io")) return "";
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (!segments.length) return "";
  return `/${segments[0]}`;
};

export const withBasePath = (path: string) => {
  const activeBasePath = detectRuntimeBasePath();
  if (!path) return activeBasePath || "/";
  if (/^[a-z]+:\/\//i.test(path)) return path;
  if (path.startsWith("#") || path.startsWith("?")) return path;
  if (!activeBasePath) return path;
  if (path === activeBasePath || path.startsWith(`${activeBasePath}/`)) return path;
  if (path.startsWith("/")) return `${activeBasePath}${path}`;
  return `${activeBasePath}/${path}`;
};

