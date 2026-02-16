type PolicyPageKind = "affiliate-disclosure" | "earnings-disclaimer" | "privacy" | "terms";

type PolicyPageProps = {
  kind: PolicyPageKind;
};

const contentByKind: Record<
  PolicyPageKind,
  {
    eyebrow: string;
    title: string;
    intro: string;
    points: string[];
  }
> = {
  "affiliate-disclosure": {
    eyebrow: "Affiliate Disclosure",
    title: "How Affiliate Links Work",
    intro:
      "Some links on this website are affiliate links. If you click and make a qualifying purchase, we may earn a commission at no extra cost to you.",
    points: [
      "Recommendations are based on product relevance and fit, not only on commissions.",
      "Commissions may vary by network, product category, and campaign terms.",
      "You should always review product details, pricing, and refund terms on the vendor site before purchase."
    ]
  },
  "earnings-disclaimer": {
    eyebrow: "Earnings Disclaimer",
    title: "No Income Guarantees",
    intro:
      "Results vary. We do not guarantee earnings, performance outcomes, or business growth from any promoted product.",
    points: [
      "Any performance examples are illustrative and not promises of future results.",
      "Your outcome depends on many factors, including skill, effort, budget, and market conditions.",
      "Always perform independent due diligence before buying any software, training, or service."
    ]
  },
  privacy: {
    eyebrow: "Privacy Policy",
    title: "Privacy Overview",
    intro: "We collect only the information needed to operate the site, improve performance, and support core functionality.",
    points: [
      "Usage analytics may be collected in aggregate to understand product interest and site performance.",
      "We do not sell personal data.",
      "If you contact us directly, we use your information only for communication and support."
    ]
  },
  terms: {
    eyebrow: "Terms of Use",
    title: "Website Terms",
    intro: "By using this site, you agree to use it lawfully and evaluate any purchase decisions independently.",
    points: [
      "Content is provided for informational and promotional purposes.",
      "Third-party products, pricing, and availability may change without notice.",
      "You are responsible for reviewing each vendor's terms, refunds, and support policies."
    ]
  }
};

const PolicyPage = ({ kind }: PolicyPageProps) => {
  const content = contentByKind[kind];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            window.history.pushState({}, "", "/");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Back to Home
        </a>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">{content.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{content.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{content.intro}</p>
          <ul className="mt-5 space-y-2">
            {content.points.map((point) => (
              <li key={point} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                {point}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default PolicyPage;
