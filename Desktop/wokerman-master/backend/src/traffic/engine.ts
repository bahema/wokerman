import type { SiteContent } from "../../../shared/siteTypes.js";
import type { EmailAnalyticsSummary } from "../email/store.js";
import type { TrafficAiComplianceItem, TrafficAiIntent, TrafficAiOpportunity, TrafficAiPlan } from "./store.js";

type GeneratorInput = {
  content: SiteContent;
  emailSummary: EmailAnalyticsSummary;
};

type TopicSeed = {
  topic: string;
  keyword: string;
  targetPath: string;
  intent: TrafficAiIntent;
  demandScore: number;
  competitionScore: number;
  relevanceScore: number;
};

const normalizeKeyword = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const scoreComposite = (seed: Pick<TopicSeed, "demandScore" | "competitionScore" | "relevanceScore">) => {
  const demandWeight = 0.4;
  const competitionWeight = 0.2;
  const relevanceWeight = 0.4;
  const inverseCompetition = 100 - seed.competitionScore;
  return Math.round(
    seed.demandScore * demandWeight + inverseCompetition * competitionWeight + seed.relevanceScore * relevanceWeight
  );
};

const toChannels = (intent: TrafficAiIntent) => {
  if (intent === "transactional") return ["seo-landing", "email-campaign", "facebook-post"];
  if (intent === "commercial") return ["seo-blog", "email-snippet", "x-thread"];
  return ["seo-blog", "faq-section", "community-post"];
};

const AFFILIATE_SENSITIVE_WORDS = [
  "guaranteed",
  "risk free",
  "instant profit",
  "100% win",
  "cure",
  "miracle",
  "no side effects"
];

const collectComplianceNotes = (topic: string) => {
  const lowered = topic.toLowerCase();
  const hits = AFFILIATE_SENSITIVE_WORDS.filter((item) => lowered.includes(item));
  if (!hits.length) return ["Keep affiliate disclosure visible near CTA."];
  return [
    `Avoid high-risk wording: ${hits.join(", ")}.`,
    "Ensure affiliate disclosure and earnings/health disclaimer are present."
  ];
};

const buildProductSeeds = (content: SiteContent): TopicSeed[] => {
  const seeds: TopicSeed[] = [];
  const sections: Array<{ path: string; items: Array<{ title: string; shortDescription: string }> }> = [
    {
      path: "/forex",
      items: content.products.forex.map((item) => ({ title: item.title, shortDescription: item.shortDescription }))
    },
    {
      path: "/betting",
      items: content.products.betting.map((item) => ({ title: item.title, shortDescription: item.shortDescription }))
    },
    {
      path: "/software",
      items: content.products.software.map((item) => ({ title: item.title, shortDescription: item.shortDescription }))
    },
    {
      path: "/social",
      items: content.products.social.map((item) => ({ title: item.title, shortDescription: item.shortDescription }))
    },
    {
      path: "/health",
      items: [
        ...((content.healthPage?.products.gadgets ?? []).map((item) => ({
          title: item.title,
          shortDescription: item.shortDescription
        })) ?? []),
        ...((content.healthPage?.products.supplements ?? []).map((item) => ({
          title: item.title,
          shortDescription: item.shortDescription
        })) ?? [])
      ]
    }
  ];

  for (const section of sections) {
    for (const item of section.items) {
      const keyword = normalizeKeyword(`${item.title} review and alternatives`);
      if (!keyword) continue;
      const titleLen = item.title.length;
      const descLen = item.shortDescription.length;
      const demandScore = clamp(40 + Math.min(40, Math.floor(descLen / 3)), 35, 92);
      const competitionScore = clamp(70 - Math.min(35, Math.floor(titleLen / 2)), 30, 85);
      const relevanceScore = clamp(60 + Math.min(35, Math.floor(titleLen / 2)), 50, 95);
      seeds.push({
        topic: `${item.title} buying-intent traffic`,
        keyword,
        targetPath: section.path,
        intent: "commercial",
        demandScore,
        competitionScore,
        relevanceScore
      });
    }
  }

  return seeds;
};

const buildIndustrySeeds = (content: SiteContent): TopicSeed[] => {
  const seeds: TopicSeed[] = [];
  for (const item of content.industries) {
    const label = item.label.trim();
    if (!label) continue;
    const keyword = normalizeKeyword(`${label} automation tools`);
    seeds.push({
      topic: `${label} industry interest capture`,
      keyword,
      targetPath: "/",
      intent: "informational",
      demandScore: 58,
      competitionScore: 46,
      relevanceScore: 62
    });
  }
  return seeds;
};

const buildEmailSeeds = (emailSummary: EmailAnalyticsSummary): TopicSeed[] => {
  const seeds: TopicSeed[] = [];
  const totals = emailSummary.totals;
  if (totals.confirmed > 0) {
    seeds.push({
      topic: "Re-engage confirmed subscribers with fresh product comparisons",
      keyword: "best automation products comparison",
      targetPath: "/",
      intent: "transactional",
      demandScore: clamp(45 + Math.min(40, Math.floor(totals.confirmed / 20)), 45, 90),
      competitionScore: 52,
      relevanceScore: 84
    });
  }
  if (totals.pending > 0) {
    seeds.push({
      topic: "Answer pre-purchase concerns for pending leads",
      keyword: "how to choose automation tools safely",
      targetPath: "/health",
      intent: "informational",
      demandScore: clamp(40 + Math.min(35, Math.floor(totals.pending / 15)), 40, 85),
      competitionScore: 42,
      relevanceScore: 72
    });
  }
  return seeds;
};

const dedupeByKeyword = (seeds: TopicSeed[]) => {
  const seen = new Set<string>();
  const unique: TopicSeed[] = [];
  for (const seed of seeds) {
    if (!seed.keyword || seen.has(seed.keyword)) continue;
    seen.add(seed.keyword);
    unique.push(seed);
  }
  return unique;
};

const toOpportunity = (seed: TopicSeed): TrafficAiOpportunity => {
  const compositeScore = scoreComposite(seed);
  return {
    id: `${seed.targetPath}:${seed.keyword}`,
    topic: seed.topic,
    keyword: seed.keyword,
    targetPath: seed.targetPath,
    intent: seed.intent,
    demandScore: seed.demandScore,
    competitionScore: seed.competitionScore,
    relevanceScore: seed.relevanceScore,
    compositeScore,
    channels: toChannels(seed.intent),
    complianceNotes: collectComplianceNotes(seed.topic)
  };
};

const buildComplianceChecklist = (opportunities: TrafficAiOpportunity[]): TrafficAiComplianceItem[] => {
  const items: TrafficAiComplianceItem[] = [
    {
      id: "affiliate-disclosure",
      severity: "warning",
      message: "Place affiliate disclosure near all monetized CTA areas."
    },
    {
      id: "earnings-claims",
      severity: "warning",
      message: "Avoid guaranteed earnings/performance claims in titles and snippets."
    },
    {
      id: "health-claims",
      severity: "warning",
      message: "Avoid medical cure claims for supplements/gadgets without approved evidence."
    },
    {
      id: "privacy-email",
      severity: "info",
      message: "Keep consent language visible for email lead capture forms."
    }
  ];

  const warningCount = opportunities.reduce((acc, item) => acc + item.complianceNotes.length, 0);
  if (warningCount > 20) {
    items.push({
      id: "copy-review",
      severity: "warning",
      message: "High compliance-note volume detected. Run manual legal/editorial review before publishing."
    });
  }
  return items;
};

export const generateTrafficAiPlan = ({ content, emailSummary }: GeneratorInput): Omit<TrafficAiPlan, "id" | "createdAt"> => {
  const seeds = dedupeByKeyword([...buildProductSeeds(content), ...buildIndustrySeeds(content), ...buildEmailSeeds(emailSummary)]);
  const opportunities = seeds.map(toOpportunity).sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 20);

  const avgCompositeScore = opportunities.length
    ? Math.round(opportunities.reduce((acc, item) => acc + item.compositeScore, 0) / opportunities.length)
    : 0;

  const highIntentCount = opportunities.filter((item) => item.intent === "transactional" || item.intent === "commercial").length;

  const productsTotal =
    content.products.forex.length +
    content.products.betting.length +
    content.products.software.length +
    content.products.social.length +
    (content.healthPage?.products.gadgets.length ?? 0) +
    (content.healthPage?.products.supplements.length ?? 0);

  return {
    source: "rule-based-local",
    summary: {
      opportunities: opportunities.length,
      avgCompositeScore,
      highIntentCount
    },
    opportunities,
    complianceChecklist: buildComplianceChecklist(opportunities),
    generatedFrom: {
      productsTotal,
      industriesTotal: content.industries.length,
      subscribersTotal: emailSummary.totals.subscribers,
      emailConfirmedTotal: emailSummary.totals.confirmed
    }
  };
};

