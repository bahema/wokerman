import { useEffect, useState } from "react";
import type { SiteContent } from "../../shared/siteTypes";
import {
  getPublishedContentAsync,
  getSiteMetaAsync,
  PUBLISHED_CACHE_KEY,
  PUBLISHED_UPDATED_EVENT
} from "../utils/adminStorage";

type SiteNavLabelKey = "fashion" | "forex" | "betting" | "software" | "social" | "health";
type SiteNavLabels = Partial<Record<SiteNavLabelKey, string>>;

const defaultNavLabels: SiteNavLabels = {
  fashion: "Fashion",
  forex: "Forex",
  betting: "Betting",
  software: "Software",
  social: "Social",
  health: "Health"
};

const resolveNavLabels = (content: SiteContent | null | undefined): SiteNavLabels => ({
  ...defaultNavLabels,
  ...(content?.homeUi?.navLabels ?? {})
});

export const useSiteNavLabels = () => {
  const [navLabels, setNavLabels] = useState<SiteNavLabels>(defaultNavLabels);
  const [siteUpdatedAt, setSiteUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const meta = await getSiteMetaAsync();
        const published = await getPublishedContentAsync();
        if (!cancelled) {
          setSiteUpdatedAt(meta?.updatedAt ?? null);
          setNavLabels(resolveNavLabels(published));
        }
      } catch {
        if (!cancelled) {
          setNavLabels(defaultNavLabels);
        }
      }
    })();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== PUBLISHED_CACHE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as SiteContent;
        setNavLabels(resolveNavLabels(parsed));
      } catch {
        // Ignore invalid cache payloads.
      }
    };

    const onPublishedUpdate = (event: Event) => {
      const next = (event as CustomEvent<SiteContent>).detail;
      if (next) {
        setNavLabels(resolveNavLabels(next));
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(PUBLISHED_UPDATED_EVENT, onPublishedUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PUBLISHED_UPDATED_EVENT, onPublishedUpdate);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      void (async () => {
        try {
          const meta = await getSiteMetaAsync();
          if (!meta?.updatedAt || cancelled || meta.updatedAt === siteUpdatedAt) return;
          const published = await getPublishedContentAsync();
          if (!cancelled) {
            setSiteUpdatedAt(meta.updatedAt);
            setNavLabels(resolveNavLabels(published));
          }
        } catch {
          // Keep current labels if polling fails.
        }
      })();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [siteUpdatedAt]);

  return navLabels;
};
