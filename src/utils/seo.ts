import { withBasePath } from "./basePath";

type SeoOptions = {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  image?: string;
  locale?: string;
};

const ensureMeta = (selector: string, attributes: Record<string, string>) => {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => node?.setAttribute(key, value));
    document.head.appendChild(node);
  }
  return node;
};

const setMetaName = (name: string, content: string) => {
  const node = ensureMeta(`meta[name="${name}"]`, { name });
  node.setAttribute("content", content);
};

const setMetaProperty = (property: string, content: string) => {
  const node = ensureMeta(`meta[property="${property}"]`, { property });
  node.setAttribute("content", content);
};

const setCanonical = (href: string) => {
  let node = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
};

export const setStructuredData = (id: string, payload: unknown) => {
  let node = document.head.querySelector<HTMLScriptElement>(`script[data-seo-id="${id}"]`);
  if (!node) {
    node = document.createElement("script");
    node.type = "application/ld+json";
    node.setAttribute("data-seo-id", id);
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(payload);
};

export const removeStructuredData = (id: string) => {
  const node = document.head.querySelector<HTMLScriptElement>(`script[data-seo-id="${id}"]`);
  if (node) node.remove();
};

export const setSeo = ({ title, description, canonicalPath = "/", robots = "index,follow", image = "/social-preview.svg", locale = "en_US" }: SeoOptions) => {
  const origin = window.location.origin;
  const canonicalUrl = new URL(withBasePath(canonicalPath), `${origin}/`).toString();
  const imageUrl = new URL(withBasePath(image), `${origin}/`).toString();

  document.title = title;
  setMetaName("description", description);
  setMetaName("robots", robots);
  setCanonical(canonicalUrl);

  setMetaProperty("og:type", "website");
  setMetaProperty("og:site_name", "AutoHub");
  setMetaProperty("og:locale", locale);
  setMetaProperty("og:title", title);
  setMetaProperty("og:description", description);
  setMetaProperty("og:url", canonicalUrl);
  setMetaProperty("og:image", imageUrl);

  setMetaName("twitter:card", "summary_large_image");
  setMetaName("twitter:title", title);
  setMetaName("twitter:description", description);
  setMetaName("twitter:image", imageUrl);
};
