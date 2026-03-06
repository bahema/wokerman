import type { ReactNode } from "react";
import { cx } from "./utils";

type FashionAdminChipTone = "neutral" | "success" | "warning" | "error";

type FashionAdminChipProps = {
  children: ReactNode;
  className?: string;
  tone?: FashionAdminChipTone;
};

const toneClass: Record<FashionAdminChipTone, string> = {
  neutral: "",
  success: "fa-state-success",
  warning: "fa-state-warning",
  error: "fa-state-error"
};

const FashionAdminChip = ({ children, className, tone = "neutral" }: FashionAdminChipProps) => (
  <span className={cx("fa-pill", toneClass[tone], className)}>{children}</span>
);

export default FashionAdminChip;

