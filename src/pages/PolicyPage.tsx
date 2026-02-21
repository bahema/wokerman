import { withBasePath } from "../utils/basePath";
import { useI18n } from "../i18n/provider";

type PolicyPageKind = "affiliate-disclosure" | "earnings-disclaimer" | "privacy" | "terms";

type PolicyPageProps = {
  kind: PolicyPageKind;
};

const PolicyPage = ({ kind }: PolicyPageProps) => {
  const { t } = useI18n();
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
      eyebrow: t("policy.affiliate.eyebrow"),
      title: t("policy.affiliate.title"),
      intro: t("policy.affiliate.intro"),
      points: [t("policy.affiliate.point1"), t("policy.affiliate.point2"), t("policy.affiliate.point3")]
    },
    "earnings-disclaimer": {
      eyebrow: t("policy.earnings.eyebrow"),
      title: t("policy.earnings.title"),
      intro: t("policy.earnings.intro"),
      points: [t("policy.earnings.point1"), t("policy.earnings.point2"), t("policy.earnings.point3")]
    },
    privacy: {
      eyebrow: t("policy.privacy.eyebrow"),
      title: t("policy.privacy.title"),
      intro: t("policy.privacy.intro"),
      points: [t("policy.privacy.point1"), t("policy.privacy.point2"), t("policy.privacy.point3")]
    },
    terms: {
      eyebrow: t("policy.terms.eyebrow"),
      title: t("policy.terms.title"),
      intro: t("policy.terms.intro"),
      points: [t("policy.terms.point1"), t("policy.terms.point2"), t("policy.terms.point3")]
    }
  };
  const content = contentByKind[kind];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <a
          href={withBasePath("/")}
          onClick={(event) => {
            event.preventDefault();
            window.history.pushState({}, "", "/");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t("policy.backHome")}
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
