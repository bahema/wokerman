import type { ReactNode } from "react";
import { cx } from "./utils";

type FashionAdminValidationTone = "success" | "warning" | "error";

type FashionAdminValidationPanelProps = {
  title: string;
  tone: FashionAdminValidationTone;
  children: ReactNode;
  className?: string;
};

const toneClass: Record<FashionAdminValidationTone, string> = {
  success: "fa-state-success",
  warning: "fa-state-warning",
  error: "fa-state-error"
};

const FashionAdminValidationPanel = ({ title, tone, children, className }: FashionAdminValidationPanelProps) => (
  <section className={cx("rounded-[var(--fa-radius-md)] border p-4", toneClass[tone], className)}>
    <p className="fa-admin-label">{title}</p>
    <div className="mt-2 text-sm leading-6">{children}</div>
  </section>
);

export default FashionAdminValidationPanel;

