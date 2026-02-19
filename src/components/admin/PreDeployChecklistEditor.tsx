import { useEffect, useMemo, useState } from "react";

type ChecklistItem = {
  id: string;
  title: string;
  detail: string;
};

const STORAGE_KEY = "boss:predeploy:checklist:v1";

const checklistItems: ChecklistItem[] = [
  {
    id: "mobile-nav",
    title: "Mobile navbar links verified",
    detail: "Confirm all mobile menu links navigate and scroll correctly."
  },
  {
    id: "auth-flow",
    title: "Auth flow verified",
    detail: "Test login, logout, and protected /boss routes."
  },
  {
    id: "content-publish",
    title: "Draft/publish cycle verified",
    detail: "Save draft, publish, and confirm homepage updates reflect changes."
  },
  {
    id: "email-modules",
    title: "Email modules verified",
    detail: "Open Email Analytics and Email Sender pages and confirm API responses."
  },
  {
    id: "api-health",
    title: "API health endpoint verified",
    detail: "Check backend /api/health returns HTTP 200 and expected metadata."
  },
  {
    id: "responsive-smoke",
    title: "Responsive smoke test completed",
    detail: "Run quick checks on mobile and desktop layouts for key pages."
  },
  {
    id: "build-pass",
    title: "Production build succeeds",
    detail: "Run npm build and verify no TypeScript/Vite errors."
  },
  {
    id: "backup-plan",
    title: "Backup/rollback plan documented",
    detail: "Have a rollback commit/deploy path and data backup before release."
  }
];

const PreDeployChecklistEditor = () => {
  const [checkedById, setCheckedById] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { checkedById?: Record<string, boolean>; notes?: string };
      setCheckedById(parsed.checkedById ?? {});
      setNotes(parsed.notes ?? "");
    } catch {
      setCheckedById({});
      setNotes("");
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          checkedById,
          notes
        })
      );
    } catch {
      // Keep checklist usable if storage is blocked.
    }
  }, [checkedById, notes]);

  const completed = useMemo(
    () => checklistItems.filter((item) => Boolean(checkedById[item.id])).length,
    [checkedById]
  );
  const percent = Math.round((completed / checklistItems.length) * 100);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Release Readiness</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {completed} / {checklistItems.length} complete ({percent}%)
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCheckedById({});
              setNotes("");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Reset Checklist
          </button>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="space-y-2">
          {checklistItems.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-2 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40"
            >
              <input
                type="checkbox"
                checked={Boolean(checkedById[item.id])}
                onChange={(event) => {
                  const next = event.currentTarget.checked;
                  setCheckedById((prev) => ({ ...prev, [item.id]: next }));
                }}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{item.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor="predeploy-notes">
          Notes
        </label>
        <textarea
          id="predeploy-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add deployment notes, blockers, URLs, and test evidence..."
          className="mt-2 h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900"
        />
      </section>
    </div>
  );
};

export default PreDeployChecklistEditor;
