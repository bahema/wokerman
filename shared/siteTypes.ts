export type ProductCategory = "Forex" | "Betting" | "Software" | "Social";
export type AdminThemePreference = "system" | "light" | "dark";
export type SiteEventTheme = "none" | "christmas" | "new-year" | "valentine" | "easter" | "ramadan" | "eid";
export type ProductSectionKey = "forex" | "betting" | "software" | "social";

export type ProductSectionCopy = {
  title: string;
  description: string;
};

export type ProductSections = Record<ProductSectionKey, ProductSectionCopy>;

export type Product = {
  id: string;
  position?: number;
  title: string;
  shortDescription: string;
  longDescription: string;
  features: string[];
  rating: number;
  isNew: boolean;
  category: ProductCategory;
  imageUrl?: string;
  checkoutLink: string;
};

export type SiteContent = {
  branding: {
    logoText: string;
    accentColor?: string;
    defaultTheme?: AdminThemePreference;
    eventTheme?: SiteEventTheme;
  };
  socials: {
    facebookUrl: string;
    whatsappUrl: string;
    other?: Array<{ name: string; url: string }>;
  };
  hero: {
    headline: string;
    subtext: string;
    ctaPrimary: { label: string; target: "forex" | "betting" | "social" | string };
    ctaSecondary: { label: string; target: "forex" | "betting" | "social" | string };
    stats: Array<{ label: string; value: string }>;
  };
  homeUi?: {
    heroEyebrow: string;
    heroQuickGrabsLabel: string;
    performanceSnapshotTitle: string;
    performanceSnapshotSubtext: string;
    adsectionMan: {
      gadgets: {
        sectionTitle: string;
        imageUrl: string;
        badgePrimary: string;
        badgeSecondary: string;
        overlayTitle: string;
        overlayText: string;
        buttonLabel: string;
        buttonTarget: string;
        scrollHint: string;
      };
      ai: {
        sectionTitle: string;
        imageUrl: string;
        badgePrimary: string;
        badgeSecondary: string;
        overlayTitle: string;
        overlayText: string;
        buttonLabel: string;
        buttonTarget: string;
        scrollHint: string;
      };
    };
    industriesHeading: string;
    industriesEmptyMessage: string;
    productCardNewBadgeLabel: string;
    productCardNewReleaseLabel: string;
    productCardKeyFeaturesSuffix: string;
    productCardCheckoutLabel: string;
    productCardMoreInfoLabel: string;
    productCardAffiliateDisclosure: string;
  };
  testimonials: Array<{ id: string; name: string; role: string; rating: number; quote: string; avatarUrl?: string }>;
  products: {
    forex: Product[];
    betting: Product[];
    software: Product[];
    social: Product[];
  };
  productSections?: ProductSections;
  industries: Array<{ id: string; label: string; icon?: string; imageUrl?: string; link?: string }>;
  footer: { note: string; copyright: string };
};
