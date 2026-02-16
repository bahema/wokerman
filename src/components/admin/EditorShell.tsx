type EditorShellProps = {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
};

const EditorShell = ({ title, description, rightSlot, children }: EditorShellProps) => (
  <section className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-4 dark:border-slate-700/70 dark:bg-slate-900/90">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">{description}</p> : null}
      </div>
      {rightSlot}
    </div>
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95">{children}</div>
  </section>
);

export default EditorShell;
