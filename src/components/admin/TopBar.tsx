import ThemeToggle from "../ThemeToggle";
import StatusChip from "./StatusChip";
import type { Theme } from "../../utils/theme";

type TopBarProps = {
  status: "Draft" | "Published";
  theme: Theme;
  onThemeToggle: () => void;
  previewPaneOpen: boolean;
  onTogglePreviewPane: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onReset: () => void;
  onLogout: () => void;
  isBusy?: boolean;
};

const TopBar = ({
  status,
  theme,
  onThemeToggle,
  previewPaneOpen,
  onTogglePreviewPane,
  onSaveDraft,
  onPublish,
  onReset,
  onLogout,
  isBusy = false
}: TopBarProps) => (
  <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/95">
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">B</span>
          <h1 className="text-lg font-bold tracking-tight">Boss Panel</h1>
        </div>
        <StatusChip status={status} />
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <button
            type="button"
            onClick={onTogglePreviewPane}
            disabled={isBusy}
            className={`rounded-xl border px-3 py-2 text-sm ${previewPaneOpen ? "border-blue-500 text-blue-600 dark:text-blue-300" : "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-100"}`}
          >
            Preview Pane
          </button>
          <button type="button" onClick={onSaveDraft} disabled={isBusy} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-100">
            Save Draft
          </button>
          <button type="button" onClick={onPublish} disabled={isBusy} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
            Publish
          </button>
          <button type="button" onClick={onReset} disabled={isBusy} className="rounded-xl border border-rose-300 px-3 py-2 text-sm text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-700 dark:text-rose-300">
            Reset
          </button>
          <button type="button" onClick={onLogout} disabled={isBusy} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-100">
            Logout
          </button>
        </div>
      </div>
    </div>
  </header>
);

export default TopBar;
