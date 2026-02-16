import type { SiteContent } from "../../../shared/siteTypes";

export const defaultPublishedContent: SiteContent = {
  branding: { logoText: "AutoHub", accentColor: "#2563eb", defaultTheme: "system" },
  socials: {
    facebookUrl: "https://facebook.com",
    whatsappUrl: "https://wa.me/",
    other: []
  },
  hero: {
    headline: "Discover next-gen tools for Forex, Betting, and Social growth.",
    subtext:
      "Curated products with fast onboarding, premium UX, and trusted workflows to help you execute faster and scale smarter.",
    ctaPrimary: { label: "Explore Forex Tools", target: "forex" },
    ctaSecondary: { label: "See New Releases", target: "betting" },
    stats: [
      { label: "Active users", value: "12.4k" },
      { label: "Avg. rating", value: "4.8" },
      { label: "Live tools", value: "24" }
    ]
  },
  testimonials: [
    {
      id: "t-1",
      name: "Client #1",
      role: "Growth Lead",
      rating: 5,
      quote: "Fast setup and clean automation. Exactly what we needed."
    },
    {
      id: "t-2",
      name: "Client #2",
      role: "Operations Manager",
      rating: 5,
      quote: "The filters and product details make decisions much easier."
    },
    {
      id: "t-3",
      name: "Client #3",
      role: "Product Owner",
      rating: 5,
      quote: "Professional UI and reliable tools in one place."
    }
  ],
  products: {
    forex: [],
    betting: [],
    software: [],
    social: []
  },
  industries: [],
  footer: {
    note: "Premium product discovery for automation-first digital operators.",
    copyright: `© ${new Date().getFullYear()} AutoHub. All rights reserved.`
  }
};
