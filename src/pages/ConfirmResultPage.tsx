import { useMemo } from "react";
import { useI18n } from "../i18n/provider";

type StatusMode = "success" | "error" | "loading";

const ConfirmResultPage = () => {
  const { t } = useI18n();
  const params = new URLSearchParams(window.location.search);
  const statusParam = (params.get("status") || "").toLowerCase();
  const mode: StatusMode = statusParam === "success" ? "success" : statusParam === "error" ? "error" : "loading";

  const copy = useMemo(() => {
    if (mode === "success") {
      return {
        icon: "✅",
        title: t("confirm.successTitle"),
        body: t("confirm.successBody"),
        next: t("confirm.successNext")
      };
    }
    if (mode === "error") {
      return {
        icon: "⚠️",
        title: t("confirm.errorTitle"),
        body: t("confirm.errorBody"),
        next: t("confirm.errorNext")
      };
    }
    return {
      icon: "⏳",
      title: t("confirm.loadingTitle"),
      body: t("confirm.loadingBody"),
      next: t("confirm.loadingNext")
    };
  }, [mode, t]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl" aria-hidden="true">
            {copy.icon}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{copy.body}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">{copy.next}</p>
        </section>
      </div>
    </div>
  );
};

export default ConfirmResultPage;
