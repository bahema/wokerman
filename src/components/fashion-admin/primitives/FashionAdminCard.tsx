import type { ReactNode } from "react";
import { cx } from "./utils";

type FashionAdminCardProps = {
  children: ReactNode;
  className?: string;
  warm?: boolean;
};

const FashionAdminCard = ({ children, className, warm = false }: FashionAdminCardProps) => (
  <section className={cx(warm ? "fa-card-warm" : "fa-card", className)}>{children}</section>
);

export default FashionAdminCard;

