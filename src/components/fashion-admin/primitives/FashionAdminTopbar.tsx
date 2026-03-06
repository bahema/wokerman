import type { ReactNode } from "react";
import { cx } from "./utils";

type FashionAdminTopbarProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

const FashionAdminTopbar = ({ eyebrow, title, subtitle, status, actions, className }: FashionAdminTopbarProps) => (
  <header
    className={cx(
      "sticky top-0 z-30 border-b px-4 py-4 backdrop-blur sm:px-6 lg:px-8",
      "border-[var(--fa-border-soft)] bg-[color-mix(in_srgb,var(--fa-surface-card)_92%,transparent)]",
      className
    )}
  >
    <div className="mx-auto flex max-w-[1700px] flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="fa-admin-label">{eyebrow}</p> : null}
        <h1 className="fa-admin-title-xl mt-1">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-[var(--fa-text-secondary)]">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status}
        {actions}
      </div>
    </div>
  </header>
);

export default FashionAdminTopbar;

