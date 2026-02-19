export type ProductCategory = "Forex" | "Betting" | "Software" | "Social";
export type AdminThemePreference = "system" | "light" | "dark";
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
