const rawBase = import.meta.env.BASE_URL || "/";
const trimmedBase = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

export const appBasePath = !trimmedBase || trimmedBase === "/" ? "" : trimmedBase;

export const withBasePath = (path: string) => {
  if (!path) return appBasePath || "/";
  if (/^[a-z]+:\/\//i.test(path)) return path;
  if (path.startsWith("#") || path.startsWith("?")) return path;
  if (!appBasePath) return path;
  if (path === appBasePath || path.startsWith(`${appBasePath}/`)) return path;
  if (path.startsWith("/")) return `${appBasePath}${path}`;
  return `${appBasePath}/${path}`;
};

