export type FashionProduct = {
  id: string;
  name: string;
  collection: string;
  category: string;
  price: number;
  badge?: string;
  badgeType?: "new" | "used" | "best-seller" | "limited" | "trending" | "editor-pick" | "hot";
  tone: string;
  note: string;
  palette: string;
  material: string;
  fit: string;
  occasion: string;
  availabilityLabel: string;
  styleTags: string[];
  ctaLabel?: string;
  whatsappNote?: string;
  whatsappNumber?: string;
  bundleIds?: string[];
  primaryImage?: string;
  detailImage?: string;
  stylingImage?: string;
};

export type FashionHighlight = {
  title: string;
  subtitle: string;
  cta: string;
  palette: string;
};

export type FashionHeroSlide = {
  id: string;
  eyebrow: string;
  badge?: string;
  headline: string;
  subtext: string;
  primaryCta: string;
  secondaryCta: string;
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
  palette: string;
  accent: string;
  imageUrl?: string;
};

export const fashionHero = {
  eyebrow: "New Season Drop",
  headline: "A premium fashion storefront built for faster browsing and cleaner product focus.",
  subtext:
    "The main Fashion page now behaves like a storefront layer: featured drops, product-led highlights, curated product rows, and a stronger path into collections."
};

export const fashionHeroSlides: FashionHeroSlide[] = [
  {
    id: "hero-001",
    eyebrow: "Campaign One",
    badge: "New",
    headline: "Sharper tailoring made for daily luxury, not noisy fashion clutter.",
    subtext:
      "A cleaner campaign frame that pushes curated silhouettes, stronger product focus, and faster movement into the affiliate conversion flow.",
    primaryCta: "Shop Collections",
    secondaryCta: "View Editorial",
    primaryCtaHref: "/fashion/collections",
    secondaryCtaHref: "/fashion/editorial",
    palette:
      "bg-[linear-gradient(145deg,#1d1612,#6d5038_56%,#d7b089)] dark:bg-[linear-gradient(145deg,#130f0c,#5e4431_56%,#c79d74)]",
    accent: "text-[#d5b18b]"
  },
  {
    id: "hero-002",
    eyebrow: "Weekend Luxe",
    badge: "Used",
    headline: "Soft structure, elevated layering, and a premium look without heavyweight ecommerce.",
    subtext:
      "This storefront stays lean: clearer product stories, faster browsing, and direct WhatsApp handoff instead of complex cart friction.",
    primaryCta: "Open Style Notes",
    secondaryCta: "Browse New Arrivals",
    primaryCtaHref: "/fashion/style-notes",
    secondaryCtaHref: "/fashion",
    palette:
      "bg-[linear-gradient(145deg,#efe2d5,#c8a07c_52%,#6e523c)] dark:bg-[linear-gradient(145deg,#231b16,#624934_52%,#c79c72)]",
    accent: "text-[#7a5e3e] dark:text-[#d5b18b]"
  },
  {
    id: "hero-003",
    eyebrow: "Editorial Edit",
    badge: "New",
    headline: "Campaign-led presentation with product depth, related picks, and a clean affiliate route.",
    subtext:
      "The fashion layer now blends editorial energy with direct product interaction so each discovery block can move naturally into contact and conversion.",
    primaryCta: "See Editorial",
    secondaryCta: "Explore Collections",
    primaryCtaHref: "/fashion/editorial",
    secondaryCtaHref: "/fashion/collections",
    palette:
      "bg-[linear-gradient(145deg,#ddd1c5,#b68d68_55%,#483529)] dark:bg-[linear-gradient(145deg,#1c1511,#543d2c_55%,#b98e67)]",
    accent: "text-[#6f533c] dark:text-[#d3b18a]"
  }
];

export const fashionHighlights: FashionHighlight[] = [
  {
    title: "Runway Utility",
    subtitle: "Structured staples designed to move from campaign imagery into daily styling without losing edge.",
    cta: "Shop now",
    palette: "bg-[linear-gradient(135deg,#dbc5ab,#b48760_58%,#6f533c)] dark:bg-[linear-gradient(135deg,#2b221b,#614731_58%,#c8a278)]"
  },
  {
    title: "Weekend Luxe",
    subtitle: "Relaxed layering pieces with soft tailoring and sharper silhouette contrast.",
    cta: "Explore edit",
    palette: "bg-[linear-gradient(135deg,#efe4d7,#c7a07b_58%,#846347)] dark:bg-[linear-gradient(135deg,#221914,#58422f_58%,#bb926a)]"
  },
  {
    title: "Evening Contrast",
    subtitle: "Darker palettes, strong outerwear, and cleaner cuts for elevated after-hours styling.",
    cta: "View pieces",
    palette: "bg-[linear-gradient(135deg,#c7b7ac,#8b6a55_58%,#3f2f24)] dark:bg-[linear-gradient(135deg,#1e1714,#473429_58%,#a57f5e)]"
  }
];

export const featuredFashionProducts: FashionProduct[] = [
  {
    id: "fashion-001",
    name: "Contour Wool Coat",
    collection: "Signature Outerwear",
    category: "Outerwear",
    price: 148,
    badge: "New",
    badgeType: "new",
    tone: "Charcoal",
    note: "A cleaner long-line silhouette built for crisp layering and sharper visual structure.",
    palette: "bg-[linear-gradient(135deg,#eaded3,#b48e6f_58%,#5f4633)] dark:bg-[linear-gradient(135deg,#231b16,#5b4330_58%,#c49a72)]",
    material: "Wool blend shell",
    fit: "Long tailored fit",
    occasion: "Work, evening layering",
    availabilityLabel: "Ready to order",
    styleTags: ["tailored", "outerwear", "monochrome"],
    ctaLabel: "Ask about this coat",
    whatsappNote: "Customer is interested in the Contour Wool Coat.",
    bundleIds: ["office-contrast", "evening-contrast"]
  },
  {
    id: "fashion-002",
    name: "Softline Tailored Blazer",
    collection: "Minimal Tailoring",
    category: "Tailoring",
    price: 92,
    badge: "Best Seller",
    badgeType: "best-seller",
    tone: "Sand",
    note: "Soft tailoring with a premium neutral palette for polished everyday styling.",
    palette: "bg-[linear-gradient(135deg,#f0e7dc,#cfb79c_58%,#8d6d4d)] dark:bg-[linear-gradient(135deg,#281f18,#6b523d_58%,#d1a77c)]",
    material: "Structured twill blend",
    fit: "Relaxed tailored fit",
    occasion: "Office, smart casual",
    availabilityLabel: "Ready this week",
    styleTags: ["blazer", "neutral", "office"],
    ctaLabel: "Reserve this blazer",
    whatsappNote: "Customer is asking about the Softline Tailored Blazer.",
    bundleIds: ["office-contrast"]
  },
  {
    id: "fashion-003",
    name: "Cityline Leather Tote",
    collection: "Accessories",
    category: "Bags",
    price: 76,
    badge: "Limited",
    badgeType: "limited",
    tone: "Espresso",
    note: "A bold carry piece designed to lift simpler looks without overloading the palette.",
    palette: "bg-[linear-gradient(135deg,#ddd0c2,#a77e5b_58%,#513b2b)] dark:bg-[linear-gradient(135deg,#241c17,#5a422f_58%,#ba916a)]",
    material: "Soft grain faux leather",
    fit: "Large carry silhouette",
    occasion: "Daily carry, city styling",
    availabilityLabel: "Limited stock",
    styleTags: ["bag", "accessory", "city"],
    ctaLabel: "Ask about this tote",
    whatsappNote: "Customer wants details for the Cityline Leather Tote.",
    bundleIds: ["weekend-layering"]
  },
  {
    id: "fashion-004",
    name: "Frame Knit Set",
    collection: "Weekend Luxe",
    category: "Sets",
    price: 84,
    tone: "Stone",
    note: "Relaxed but premium co-ord styling built around cleaner proportion and comfort.",
    palette: "bg-[linear-gradient(135deg,#eee4d7,#c8a685_58%,#77593e)] dark:bg-[linear-gradient(135deg,#241c17,#5b4633_58%,#c39a72)]",
    material: "Ribbed knit blend",
    fit: "Relaxed set fit",
    occasion: "Weekend, travel",
    availabilityLabel: "Ready to order",
    styleTags: ["set", "weekend", "relaxed"],
    ctaLabel: "Order this knit set",
    whatsappNote: "Customer is interested in the Frame Knit Set.",
    bundleIds: ["weekend-layering"]
  },
  {
    id: "fashion-005",
    name: "Edge Runner Loafers",
    collection: "Footwear",
    category: "Footwear",
    price: 64,
    badge: "Trending",
    badgeType: "trending",
    tone: "Onyx",
    note: "Sharp profile footwear to anchor softer tailoring and cleaner monochrome looks.",
    palette: "bg-[linear-gradient(135deg,#e7dbcf,#b38c69_58%,#4e392b)] dark:bg-[linear-gradient(135deg,#1f1814,#533d2d_58%,#bc936b)]",
    material: "Polished vegan leather",
    fit: "Slim profile fit",
    occasion: "Office, occasion wear",
    availabilityLabel: "Popular now",
    styleTags: ["footwear", "sharp", "formal"],
    ctaLabel: "Check sizing on WhatsApp",
    whatsappNote: "Customer wants sizing help for the Edge Runner Loafers.",
    bundleIds: ["weekend-layering", "office-contrast"]
  },
  {
    id: "fashion-006",
    name: "Column Satin Dress",
    collection: "Evening",
    category: "Dresses",
    price: 118,
    tone: "Midnight",
    note: "High-contrast evening styling with a simplified line and stronger luxury finish.",
    palette: "bg-[linear-gradient(135deg,#eadfd6,#b79070_58%,#694d37)] dark:bg-[linear-gradient(135deg,#231b16,#604633_58%,#c79d74)]",
    material: "Satin finish blend",
    fit: "Column silhouette",
    occasion: "Evening, dinner events",
    availabilityLabel: "Ready this week",
    styleTags: ["dress", "evening", "sleek"],
    ctaLabel: "Ask about this dress",
    whatsappNote: "Customer is interested in the Column Satin Dress.",
    bundleIds: ["evening-contrast"]
  }
];

export const trendRail: FashionProduct[] = [
  {
    id: "fashion-007",
    name: "Ribbed Studio Top",
    collection: "Daily Edit",
    category: "Tops",
    price: 42,
    tone: "Ivory",
    note: "A quick-lift styling piece for cleaner base layers.",
    palette: "bg-[linear-gradient(135deg,#f5ece3,#d6bc9f_58%,#9a7a59)] dark:bg-[linear-gradient(135deg,#2a2018,#6c523b_58%,#cfaa82)]",
    material: "Ribbed cotton blend",
    fit: "Close body fit",
    occasion: "Daily wear, layering",
    availabilityLabel: "Available now",
    styleTags: ["top", "layering", "daily"],
    ctaLabel: "Ask about this top",
    whatsappNote: "Customer is interested in the Ribbed Studio Top.",
    bundleIds: ["office-contrast"]
  },
  {
    id: "fashion-008",
    name: "Waistline Pleat Trousers",
    collection: "Minimal Tailoring",
    category: "Bottoms",
    price: 58,
    tone: "Taupe",
    note: "Structured lower-half silhouette with softer movement.",
    palette: "bg-[linear-gradient(135deg,#eee4d9,#c6a88c_58%,#836246)] dark:bg-[linear-gradient(135deg,#241b15,#5f4732_58%,#c79d74)]",
    material: "Pleated suiting blend",
    fit: "Relaxed straight leg",
    occasion: "Office, smart casual",
    availabilityLabel: "Available now",
    styleTags: ["trousers", "tailoring", "smart"],
    ctaLabel: "Reserve these trousers",
    whatsappNote: "Customer is asking about the Waistline Pleat Trousers.",
    bundleIds: ["office-contrast"]
  },
  {
    id: "fashion-009",
    name: "Accent Frame Sunglasses",
    collection: "Accessories",
    category: "Accessories",
    price: 36,
    tone: "Smoke",
    note: "Quick editorial accent for stronger profile styling.",
    palette: "bg-[linear-gradient(135deg,#eadfd3,#b48c69_58%,#684d37)] dark:bg-[linear-gradient(135deg,#211915,#5a4230_58%,#be956d)]",
    material: "Lightweight acetate frame",
    fit: "Wide frame fit",
    occasion: "Weekend, travel",
    availabilityLabel: "Available now",
    styleTags: ["accessory", "eyewear", "editorial"],
    ctaLabel: "Ask about these sunglasses",
    whatsappNote: "Customer wants details for the Accent Frame Sunglasses.",
    bundleIds: ["office-contrast", "weekend-layering"]
  },
  {
    id: "fashion-010",
    name: "Cropped Utility Jacket",
    collection: "Street Edit",
    category: "Outerwear",
    price: 73,
    badge: "Hot",
    badgeType: "hot",
    tone: "Clay",
    note: "Stronger outerwear edge for casual luxury mixes.",
    palette: "bg-[linear-gradient(135deg,#e8dccf,#b88f6d_58%,#694c36)] dark:bg-[linear-gradient(135deg,#201915,#5e4431_58%,#c19870)]",
    material: "Utility cotton twill",
    fit: "Cropped relaxed fit",
    occasion: "Streetwear, weekend",
    availabilityLabel: "Trending now",
    styleTags: ["outerwear", "street", "casual"],
    ctaLabel: "Ask about this jacket",
    whatsappNote: "Customer is interested in the Cropped Utility Jacket.",
    bundleIds: ["weekend-layering"]
  },
  {
    id: "fashion-011",
    name: "Contour Buckle Belt",
    collection: "Accessories",
    category: "Accessories",
    price: 28,
    badge: "Editor Pick",
    badgeType: "editor-pick",
    tone: "Mocha",
    note: "A compact finishing piece that sharpens waistlines and gives softer silhouettes a cleaner break.",
    palette: "bg-[linear-gradient(135deg,#efe5d8,#c8a07b_58%,#78563f)] dark:bg-[linear-gradient(135deg,#241b15,#5f4633_58%,#caa07a)]",
    material: "Smooth faux leather",
    fit: "Adjustable belt fit",
    occasion: "Office, daily styling",
    availabilityLabel: "Available now",
    styleTags: ["belt", "accessory", "finishing"],
    ctaLabel: "Ask about this belt",
    whatsappNote: "Customer is interested in the Contour Buckle Belt.",
    bundleIds: ["office-contrast", "travel-ease"]
  },
  {
    id: "fashion-012",
    name: "Studio Chain Crossbody",
    collection: "Accessories",
    category: "Bags",
    price: 62,
    badge: "New",
    badgeType: "new",
    tone: "Cocoa",
    note: "A smaller structured bag that keeps the look premium while still feeling practical for quick movement.",
    palette: "bg-[linear-gradient(135deg,#eadfd2,#bb946f_58%,#684b35)] dark:bg-[linear-gradient(135deg,#221914,#59412f_58%,#bd946d)]",
    material: "Structured faux leather",
    fit: "Compact crossbody shape",
    occasion: "Daily carry, evenings out",
    availabilityLabel: "Fresh arrival",
    styleTags: ["bag", "crossbody", "compact"],
    ctaLabel: "Reserve this crossbody",
    whatsappNote: "Customer wants details for the Studio Chain Crossbody.",
    bundleIds: ["evening-contrast", "travel-ease"]
  },
  {
    id: "fashion-013",
    name: "Silk Edge Headscarf",
    collection: "Accessories",
    category: "Accessories",
    price: 24,
    badge: "Limited",
    badgeType: "limited",
    tone: "Champagne",
    note: "A lighter accent that adds tone contrast without overwhelming cleaner tailoring or travel sets.",
    palette: "bg-[linear-gradient(135deg,#f5ece1,#d8ba99_58%,#9b7658)] dark:bg-[linear-gradient(135deg,#2a2018,#70533d_58%,#d0a982)]",
    material: "Silk-touch blend",
    fit: "Light drape fit",
    occasion: "Travel, weekend styling",
    availabilityLabel: "Small batch",
    styleTags: ["scarf", "accent", "lightweight"],
    ctaLabel: "Ask about this scarf",
    whatsappNote: "Customer is asking about the Silk Edge Headscarf.",
    bundleIds: ["weekend-layering", "travel-ease"]
  },
  {
    id: "fashion-014",
    name: "Mirror Stud Earrings",
    collection: "Accessories",
    category: "Accessories",
    price: 19,
    badge: "Editor Pick",
    badgeType: "editor-pick",
    tone: "Silver",
    note: "Small reflective pieces that lift evening edits and premium campaign shots with minimal visual weight.",
    palette: "bg-[linear-gradient(135deg,#ece7e1,#c7c1ba_58%,#81776d)] dark:bg-[linear-gradient(135deg,#221f1b,#5a544d_58%,#b8aea1)]",
    material: "Polished alloy finish",
    fit: "Stud fit",
    occasion: "Evening, event styling",
    availabilityLabel: "Available now",
    styleTags: ["jewelry", "evening", "minimal"],
    ctaLabel: "Ask about these earrings",
    whatsappNote: "Customer wants details for the Mirror Stud Earrings.",
    bundleIds: ["evening-contrast"]
  }
];

export const fashionTrustPoints = [
  "Curated weekly drops",
  "Premium-styled selections",
  "Faster storefront browsing",
  "Cleaner collection routing"
];
