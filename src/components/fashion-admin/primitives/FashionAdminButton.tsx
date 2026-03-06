import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

type FashionAdminButtonVariant = "primary" | "secondary" | "ghost";

type FashionAdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: FashionAdminButtonVariant;
};

const variantClass: Record<FashionAdminButtonVariant, string> = {
  primary: "fa-btn-primary",
  secondary: "fa-btn-secondary",
  ghost: "fa-btn-ghost"
};

const FashionAdminButton = ({ children, variant = "ghost", className, ...props }: FashionAdminButtonProps) => (
  <button type="button" className={cx("fa-btn", variantClass[variant], className)} {...props}>
    {children}
  </button>
);

export default FashionAdminButton;

