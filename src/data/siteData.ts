import type { Product, ProductSections, SiteContent } from "../../shared/siteTypes";
export type { Product, SiteContent, ProductCategory, AdminThemePreference, SiteEventTheme } from "../../shared/siteTypes";

type ProductWithOptionalPrice = Product & {
  price?: number;
  priceLabel?: string;
};

type HomeUiWithOptionalAdPrices = NonNullable<SiteContent["homeUi"]> & {
  adsectionMan: {
    gadgets: NonNullable<SiteContent["homeUi"]>["adsectionMan"]["gadgets"] & {
      price?: number;
      priceBadge?: string;
    };
    ai: NonNullable<SiteContent["homeUi"]>["adsectionMan"]["ai"] & {
      price?: number;
      priceBadge?: string;
    };
  };
};

const makeLink = (slug: string) => `https://example.com/checkout/${slug}`;

const forexProducts: ProductWithOptionalPrice[] = [
  {
    id: "fx-1",
    title: "PipPulse Scanner",
    shortDescription: "Spot intraday momentum setups with confidence signals.",
    longDescription:
      "PipPulse Scanner continuously maps market momentum across major pairs and surfaces trade-ready setups backed by volatility and trend alignment scoring.",
    features: ["Real-time pair heatmap", "Entry confidence meter", "Session overlap alerts"],
    rating: 4.8,
    price: 79,
    isNew: true,
    category: "Forex",
    checkoutLink: makeLink("pippulse-scanner")
  },
  {
    id: "fx-2",
    title: "MacroFlow Terminal",
    shortDescription: "Blend macro calendar events with live FX impact overlays.",
    longDescription:
      "MacroFlow Terminal helps traders front-run high-impact events by combining a curated economic calendar with pair sensitivity modeling and sentiment snapshots.",
    features: ["Smart event ranking", "Pair impact forecast", "Historical event replay"],
    rating: 4.7,
    price: 79,
    isNew: true,
    category: "Forex",
    checkoutLink: makeLink("macroflow-terminal")
  },
  {
    id: "fx-3",
    title: "Liquidity Ladder",
    shortDescription: "Track institutional liquidity zones and rejection behavior.",
    longDescription:
      "Liquidity Ladder identifies probable sweep areas and marks premium/discount regions so you can align entries with structure and execution precision.",
    features: ["Liquidity sweep detector", "Structure tagging", "Execution checklist"],
    rating: 4.6,
    price: 79,
    isNew: false,
    category: "Forex",
    checkoutLink: makeLink("liquidity-ladder")
  },
  {
    id: "fx-4",
    title: "RiskGuard FX",
    shortDescription: "Automated lot sizing and stop logic for disciplined entries.",
    longDescription:
      "RiskGuard FX enforces predefined risk rules for every trade and suggests position sizes based on account equity, volatility, and stop distance.",
    features: ["Dynamic lot sizing", "Max drawdown guardrails", "Trade journal export"],
    rating: 4.9,
    price: 79,
    isNew: false,
    category: "Forex",
    checkoutLink: makeLink("riskguard-fx")
  },
  {
    id: "fx-5",
    title: "London Breakout Pro",
    shortDescription: "Capture opening range breaks during London session volatility.",
    longDescription:
      "London Breakout Pro automates range definition and gives probability-weighted break scenarios to help you execute with better timing and tighter risk.",
    features: ["Opening range auto-draw", "Break probability model", "Target projection"],
    rating: 4.5,
    price: 79,
    isNew: false,
    category: "Forex",
    checkoutLink: makeLink("london-breakout-pro")
  },
  {
    id: "fx-6",
    title: "TrendMatrix AI",
    shortDescription: "Multi-timeframe trend scoring with reversal early warnings.",
    longDescription:
      "TrendMatrix AI consolidates directional signals across timeframes and warns when trend fatigue appears, allowing cleaner trend-following decisions.",
    features: ["Multi-timeframe score", "Reversal probability alerts", "Bias dashboard"],
    rating: 4.8,
    price: 79,
    isNew: true,
    category: "Forex",
    checkoutLink: makeLink("trendmatrix-ai")
  }
];

const bettingProducts: ProductWithOptionalPrice[] = [
  {
    id: "bet-1",
    title: "OddsEdge Studio",
    shortDescription: "Live value-bet detection across top sportsbooks.",
    longDescription:
      "OddsEdge Studio scans live odds movement and flags mispriced markets so you can react faster with consistent betting logic.",
    features: ["Cross-book odds sync", "Value signal engine", "Stake planner"],
    rating: 4.7,
    price: 69,
    isNew: true,
    category: "Betting",
    checkoutLink: makeLink("oddsedge-studio")
  },
  {
    id: "bet-2",
    title: "MatchIntel Pro",
    shortDescription: "Team form analytics with matchup-specific projections.",
    longDescription:
      "MatchIntel Pro gives you form trend summaries, head-to-head context, and tactical matchup projections for smarter pre-match decisions.",
    features: ["Form trend cards", "Head-to-head model", "Injury impact notes"],
    rating: 4.6,
    price: 69,
    isNew: false,
    category: "Betting",
    checkoutLink: makeLink("matchintel-pro")
  },
  {
    id: "bet-3",
    title: "ArbSprint Finder",
    shortDescription: "Identify arbitrage windows and timing opportunities.",
    longDescription:
      "ArbSprint Finder detects cross-book discrepancies and alerts you to short-lived windows with margin and execution confidence data.",
    features: ["Arbitrage scanner", "Margin calculator", "Execution speed alerts"],
    rating: 4.9,
    price: 69,
    isNew: true,
    category: "Betting",
    checkoutLink: makeLink("arbsprint-finder")
  },
  {
    id: "bet-4",
    title: "Bankroll Beacon",
    shortDescription: "Automated bankroll strategy and streak protection.",
    longDescription:
      "Bankroll Beacon introduces dynamic staking profiles and anti-tilt boundaries designed to preserve capital over long betting cycles.",
    features: ["Adaptive staking plans", "Loss streak controls", "ROI performance view"],
    rating: 4.5,
    price: 69,
    isNew: false,
    category: "Betting",
    checkoutLink: makeLink("bankroll-beacon")
  },
  {
    id: "bet-5",
    title: "LiveBet Commander",
    shortDescription: "Real-time momentum prompts for in-play markets.",
    longDescription:
      "LiveBet Commander tracks tempo shifts and market reactions during matches, highlighting possible live-bet entries with risk context.",
    features: ["In-play momentum meter", "Market reaction timeline", "One-click watchlist"],
    rating: 4.7,
    price: 69,
    isNew: false,
    category: "Betting",
    checkoutLink: makeLink("livebet-commander")
  },
  {
    id: "bet-6",
    title: "SharpSignal Radar",
    shortDescription: "Follow sharp money movement and line shifts.",
    longDescription:
      "SharpSignal Radar aggregates line movement patterns and reverse-line movement indicators to surface potentially informed positions.",
    features: ["Line shift tracker", "Reverse movement alerts", "Sharp action panel"],
    rating: 4.8,
    price: 69,
    isNew: true,
    category: "Betting",
    checkoutLink: makeLink("sharpsignal-radar")
  }
];

const softwareProducts: ProductWithOptionalPrice[] = [
  {
    id: "sw-1",
    title: "LaunchPilot CRM",
    shortDescription: "Pipeline automation for digital product teams.",
    longDescription:
      "LaunchPilot CRM streamlines lead tracking, sales workflows, and follow-up automation for faster launch cycles and cleaner revenue ops.",
    features: ["Workflow automation", "Lead scoring", "Revenue forecast board"],
    rating: 4.8,
    price: 99,
    isNew: true,
    category: "Software",
    checkoutLink: makeLink("launchpilot-crm")
  },
  {
    id: "sw-2",
    title: "CloudSync Vault",
    shortDescription: "Secure file syncing with team access controls.",
    longDescription:
      "CloudSync Vault offers encrypted syncing, role-based collaboration, and activity trails to keep distributed teams aligned and secure.",
    features: ["Encrypted storage", "Role-based permissions", "Audit activity feed"],
    rating: 4.6,
    price: 99,
    isNew: false,
    category: "Software",
    checkoutLink: makeLink("cloudsync-vault")
  },
  {
    id: "sw-3",
    title: "InsightBoard 2.0",
    shortDescription: "Unified analytics dashboard with real-time KPIs.",
    longDescription:
      "InsightBoard 2.0 connects multiple data sources and visualizes critical metrics in a single view to support fast, data-backed decisions.",
    features: ["Multi-source connectors", "Live KPI board", "Custom report exports"],
    rating: 4.9,
    price: 99,
    isNew: true,
    category: "Software",
    checkoutLink: makeLink("insightboard-2")
  },
  {
    id: "sw-4",
    title: "SupportFlow AI",
    shortDescription: "Ticket routing and response drafting automation.",
    longDescription:
      "SupportFlow AI triages inbound support tickets and drafts context-aware responses to reduce handling time while improving consistency.",
    features: ["Smart ticket routing", "AI draft responses", "SLA monitoring"],
    rating: 4.7,
    price: 99,
    isNew: false,
    category: "Software",
    checkoutLink: makeLink("supportflow-ai")
  },
  {
    id: "sw-5",
    title: "DeployBeam",
    shortDescription: "Release orchestration with rollback controls.",
    longDescription:
      "DeployBeam coordinates staged rollouts, health monitoring, and instant rollback procedures for stable deployment pipelines.",
    features: ["Staged rollouts", "Release health checks", "One-click rollback"],
    rating: 4.5,
    price: 99,
    isNew: false,
    category: "Software",
    checkoutLink: makeLink("deploybeam")
  },
  {
    id: "sw-6",
    title: "CreatorSuite X",
    shortDescription: "Content ops toolkit for fast production teams.",
    longDescription:
      "CreatorSuite X centralizes briefs, production calendars, and approval workflows so content teams can ship more without bottlenecks.",
    features: ["Editorial planning board", "Approval workflows", "Asset management"],
    rating: 4.8,
    price: 99,
    isNew: true,
    category: "Software",
    checkoutLink: makeLink("creatorsuite-x")
  }
];

const socialProducts: ProductWithOptionalPrice[] = [
  {
    id: "soc-1",
    title: "PostPilot Social",
    shortDescription: "Cross-platform scheduling with smart posting windows.",
    longDescription:
      "PostPilot Social predicts audience activity windows and auto-schedules content to maximize reach across your core channels.",
    features: ["Best-time posting engine", "Multi-channel scheduler", "Performance snapshots"],
    rating: 4.8,
    price: 59,
    isNew: true,
    category: "Social",
    checkoutLink: makeLink("postpilot-social")
  },
  {
    id: "soc-2",
    title: "CommentFlow AI",
    shortDescription: "Automated moderation and response assistance.",
    longDescription:
      "CommentFlow AI monitors comments, flags harmful interactions, and drafts tailored replies so teams can keep community health strong.",
    features: ["Toxicity filtering", "Reply suggestions", "Priority inbox"],
    rating: 4.6,
    price: 59,
    isNew: false,
    category: "Social",
    checkoutLink: makeLink("commentflow-ai")
  },
  {
    id: "soc-3",
    title: "ReelBoost Engine",
    shortDescription: "Short-form optimization toolkit with trend prompts.",
    longDescription:
      "ReelBoost Engine assists with hook selection, clip pacing, and hashtag recommendations to improve short-form content performance.",
    features: ["Hook generator", "Trend monitor", "Hashtag suggestions"],
    rating: 4.7,
    price: 59,
    isNew: true,
    category: "Social",
    checkoutLink: makeLink("reelboost-engine")
  },
  {
    id: "soc-4",
    title: "DM Router Pro",
    shortDescription: "Route DMs to teams with priority and intent tags.",
    longDescription:
      "DM Router Pro classifies incoming direct messages by intent and routes them to sales, support, or community teams for rapid handling.",
    features: ["Intent classification", "Team routing rules", "Response SLA alerts"],
    rating: 4.5,
    price: 59,
    isNew: false,
    category: "Social",
    checkoutLink: makeLink("dm-router-pro")
  },
  {
    id: "soc-5",
    title: "Influence Atlas",
    shortDescription: "Creator discovery and collaboration workflow.",
    longDescription:
      "Influence Atlas maps creator performance by niche and helps manage outreach, negotiation, and campaign execution from one workspace.",
    features: ["Creator scoring", "Outreach tracker", "Campaign timeline"],
    rating: 4.9,
    price: 59,
    isNew: true,
    category: "Social",
    checkoutLink: makeLink("influence-atlas")
  },
  {
    id: "soc-6",
    title: "CampaignPulse Social",
    shortDescription: "Measure campaign ROI with attribution views.",
    longDescription:
      "CampaignPulse Social links content activity to conversions with clear attribution dashboards to guide budget and strategy decisions.",
    features: ["Attribution dashboard", "Funnel breakdowns", "Weekly performance digest"],
    rating: 4.7,
    price: 59,
    isNew: false,
    category: "Social",
    checkoutLink: makeLink("campaignpulse-social")
  }
];

export const defaultProductSections: ProductSections = {
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
};

export const defaultHomeUi: HomeUiWithOptionalAdPrices = {
  heroEyebrow: "Smart automation for modern operators",
  heroQuickGrabsLabel: "Quick Grabs",
  performanceSnapshotTitle: "Performance Snapshot",
  performanceSnapshotSubtext: "Products tuned for speed, confidence, and measurable outcomes.",
  adsectionMan: {
    gadgets: {
      sectionTitle: "Newer Gadgets",
      price: 79,
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
};

export const defaultSiteContent: SiteContent = {
  branding: { logoText: "AutoHub", accentColor: "#2563eb", defaultTheme: "system", eventTheme: "none" },
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
  homeUi: defaultHomeUi,
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
    forex: forexProducts,
    betting: bettingProducts,
    software: softwareProducts,
    social: socialProducts
  },
  productSections: defaultProductSections,
  industries: [
    { id: "ind-1", label: "Finance", icon: "💹" },
    { id: "ind-2", label: "Sports Betting", icon: "🎯" },
    { id: "ind-3", label: "SaaS", icon: "🧩" },
    { id: "ind-4", label: "E-commerce", icon: "🛒" },
    { id: "ind-5", label: "Marketing", icon: "📣" },
    { id: "ind-6", label: "Education", icon: "🎓" },
    { id: "ind-7", label: "Healthcare", icon: "🩺" },
    { id: "ind-8", label: "Logistics", icon: "🚚" }
  ],
  footer: {
    note: "Premium product discovery for automation-first digital operators.",
    copyright: `© ${new Date().getFullYear()} AutoHub. All rights reserved.`
  }
};


