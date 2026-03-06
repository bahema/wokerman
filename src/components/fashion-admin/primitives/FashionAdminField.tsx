import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./utils";

type FieldLabelProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export const FashionAdminFieldLabel = ({ label, hint, children, className }: FieldLabelProps) => (
  <label className={cx("block space-y-2", className)}>
    <span className="fa-admin-label">{label}</span>
    {children}
    {hint ? <p className="text-xs text-[var(--fa-text-tertiary)]">{hint}</p> : null}
  </label>
);

export const FashionAdminInput = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cx("fa-input", className)} {...props} />
);

export const FashionAdminTextarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cx("fa-input min-h-[6.4rem] resize-y", className)} {...props} />
);

export const FashionAdminSelect = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cx("fa-input fa-select", className)} {...props}>
    {children}
  </select>
);
