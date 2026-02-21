import type { SiteContent } from "../../../shared/siteTypes";

// Keep backend defaults local so backend builds are not coupled to frontend source files.
export const defaultPublishedContent: SiteContent = {
  branding: { logoText: "AutoHub", accentColor: "#2563eb", defaultTheme: "system", eventTheme: "none" },
  socials: {
    facebookUrl: "https://facebook.com",
    whatsappUrl: "https://wa.me/",
    other: []
  },
  hero: {
    headline: "Discover next-gen tools for Forex, Betting, and Social growth.",
    subtext: "Curated products with fast onboarding and trusted workflows.",
    ctaPrimary: { label: "Explore Forex Tools", target: "forex" },
    ctaSecondary: { label: "See New Releases", target: "betting" },
    stats: [
      { label: "Active users", value: "12.4k" },
      { label: "Avg. rating", value: "4.8" },
      { label: "Live tools", value: "24" }
    ]
  },
  homeUi: {
    heroEyebrow: "Smart automation for modern operators",
    heroQuickGrabsLabel: "Quick Grabs",
    performanceSnapshotTitle: "Performance Snapshot",
    performanceSnapshotSubtext: "Products tuned for speed, confidence, and measurable outcomes.",
    adsectionMan: {
      gadgets: {
        sectionTitle: "Newer Gadgets",
        price: 79,
        priceBadge: "$79",
        imageUrl: "/logo.png",
        badgePrimary: "New",
        badgeSecondary: "Coming Soon",
        overlayTitle: "Gadget Drop",
        overlayText: "Tap in early for fresh utility tools.",
        buttonLabel: "Check Fresh Drop",
        buttonTarget: "forex",
        scrollHint: "Scroll"
      },
      ai: {
        sectionTitle: "New AI Tools",
        price: 99,
        priceBadge: "$99",
        imageUrl: "/logo.png",
        badgePrimary: "New",
        badgeSecondary: "Coming Soon",
        overlayTitle: "AI Update",
        overlayText: "Discover the next wave of smart tools.",
        buttonLabel: "Check Fresh AI",
        buttonTarget: "software",
        scrollHint: "Scroll"
      }
    },
    industriesHeading: "Industries We Work With",
    industriesEmptyMessage: "No industries published yet. Add industries from Admin to show them here.",
    productCardNewBadgeLabel: "NEW",
    productCardNewReleaseLabel: "New release",
    productCardKeyFeaturesSuffix: "key features",
    productCardCheckoutLabel: "Proceed to Checkout",
    productCardMoreInfoLabel: "Get More Info",
    productCardAffiliateDisclosure: "Affiliate disclosure: we may earn a commission if you buy through this link, at no extra cost to you."
  },
  testimonials: [],
  products: {
    forex: [],
    betting: [],
    software: [],
    social: []
  },
  productSections: {
    forex: {
      title: "Forex New Items",
      description: "Freshly released forex tools with strong ratings and practical execution workflows."
    },
    betting: {
      title: "Betting System Products",
      description: "High-performing betting tools and systems."
    },
    software: {
      title: "New Released Software",
      description: "Browse newly released software products."
    },
    social: {
      title: "Social Media Automation",
      description: "Automation-focused social products for scheduling, response workflows, and campaign optimization."
    }
  },
  industries: [{ id: "ind-1", label: "Finance", icon: "$" }],
  footer: {
    note: "Premium product discovery for automation-first digital operators.",
    copyright: `© ${new Date().getFullYear()} AutoHub. All rights reserved.`
  }
};
