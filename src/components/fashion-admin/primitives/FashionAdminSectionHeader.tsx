import type { ReactNode } from "react";
import { cx } from "./utils";

type FashionAdminSectionHeaderProps = {
  label: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

const FashionAdminSectionHeader = ({ label, title, description, actions, className }: FashionAdminSectionHeaderProps) => (
  <header className={cx("fa-card-warm p-5", className)}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="fa-admin-label">{label}</p>
        <h2 className="fa-admin-title-lg mt-2">{title}</h2>
        {description ? <p className="mt-2 text-sm text-[var(--fa-text-secondary)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  </header>
);

export default FashionAdminSectionHeader;

